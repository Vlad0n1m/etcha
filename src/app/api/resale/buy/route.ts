import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { buyFromResale } from '@/lib/services/AuctionHouseService'
import { isValidSolanaAddress, solToLamports } from '@/lib/utils/wallet'
import { deriveKeypairFromSignature, getDerivationSalt } from '@/lib/utils/keyDerivation.server'
import { PublicKey, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js'

const prisma = new PrismaClient()

/**
 * POST /api/resale/buy
 * Buy a resale ticket
 * Body: { listingId: string, buyerWallet: string, signature: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { listingId, buyerWallet, signature } = body

        // Validation
        if (!listingId || !buyerWallet || !signature) {
            return NextResponse.json(
                { success: false, message: 'listingId, buyerWallet, and signature are required' },
                { status: 400 }
            )
        }

        if (!isValidSolanaAddress(buyerWallet)) {
            return NextResponse.json(
                { success: false, message: 'Invalid buyer wallet address format' },
                { status: 400 }
            )
        }

        // Get listing with related data
        const listing = await prisma.listing.findUnique({
            where: {
                id: listingId,
            },
            select: {
                id: true,
                nftMintAddress: true,
                price: true,
                status: true,
                sellerSignature: true,
                eventId: true,
                event: {
                    select: {
                        id: true,
                        date: true,
                    },
                },
                seller: {
                    select: {
                        id: true,
                        walletAddress: true,
                        internalWalletAddress: true,
                    },
                },
            },
        })

        if (!listing) {
            return NextResponse.json(
                { success: false, message: 'Listing not found' },
                { status: 404 }
            )
        }

        // Check if listing is active
        if (listing.status !== 'active') {
            return NextResponse.json(
                { success: false, message: 'This ticket is no longer available for purchase' },
                { status: 400 }
            )
        }

        // Check if event has passed
        const eventDate = new Date(listing.event.date)
        const now = new Date()
        if (eventDate < now) {
            return NextResponse.json(
                { success: false, message: 'Cannot buy tickets for past events' },
                { status: 400 }
            )
        }

        // Find or create buyer user
        let buyer = await prisma.user.findUnique({
            where: {
                walletAddress: buyerWallet,
            },
            select: {
                id: true,
                internalWalletAddress: true,
            },
        })

        // Check if buyer is the seller (by external wallet or internal wallet)
        if (buyer && buyer.id === listing.sellerId) {
            return NextResponse.json(
                { success: false, message: 'You cannot buy your own ticket' },
                { status: 400 }
            )
        }
        
        // Also check by internal wallet address (in case same person uses different external wallet)
        if (buyer && buyer.internalWalletAddress && listing.seller.internalWalletAddress) {
            if (buyer.internalWalletAddress === listing.seller.internalWalletAddress) {
                return NextResponse.json(
                    { success: false, message: 'You cannot buy your own ticket (same internal wallet detected)' },
                    { status: 400 }
                )
            }
        }

        // Derive buyer keypair from signature
        const salt = getDerivationSalt()
        console.log('Deriving buyer keypair from signature...')
        console.log('Buyer wallet:', buyerWallet)
        console.log('Signature length:', signature.length)
        
        const buyerKeypair = deriveKeypairFromSignature(signature, buyerWallet, salt)
        const buyerInternalAddress = buyerKeypair.publicKey.toString()
        console.log('Derived buyer internal address:', buyerInternalAddress)

        // Create or update buyer user
        if (!buyer) {
            buyer = await prisma.user.create({
                data: {
                    walletAddress: buyerWallet,
                    internalWalletAddress: buyerInternalAddress,
                },
                select: {
                    id: true,
                    internalWalletAddress: true,
                },
            })
        } else if (buyer.internalWalletAddress !== buyerInternalAddress) {
            // Update internal wallet address if it changed
            buyer = await prisma.user.update({
                where: { id: buyer.id },
                data: {
                    internalWalletAddress: buyerInternalAddress,
                },
                select: {
                    id: true,
                    internalWalletAddress: true,
                },
            })
        }

        // Get seller's internal wallet address
        if (!listing.seller.internalWalletAddress) {
            return NextResponse.json(
                { success: false, message: 'Seller internal wallet not found' },
                { status: 500 }
            )
        }

        // Use stored seller signature from listing (saved when listing was created)
        // This allows instant purchase without seller being online
        const sellerSignature = listing.sellerSignature
        
        if (!sellerSignature) {
            return NextResponse.json(
                { 
                    success: false, 
                    message: 'Seller signature not found in listing. This listing may have been created before signature storage was implemented.',
                },
                { status: 400 }
            )
        }

        // Derive seller keypair from stored signature
        console.log('Deriving seller keypair from signature...')
        console.log('Seller wallet:', listing.seller.walletAddress)
        console.log('Stored internalWalletAddress:', listing.seller.internalWalletAddress)
        console.log('Signature length:', sellerSignature.length)
        
        const sellerKeypair = deriveKeypairFromSignature(
            sellerSignature,
            listing.seller.walletAddress,
            salt
        )
        
        const derivedSellerAddress = sellerKeypair.publicKey.toString()
        console.log('Derived seller internal address:', derivedSellerAddress)

        // Verify seller owns the internal wallet
        if (derivedSellerAddress !== listing.seller.internalWalletAddress) {
            console.error('Seller signature mismatch!')
            console.error('Expected:', listing.seller.internalWalletAddress)
            console.error('Got:', derivedSellerAddress)
            console.error('Signature (first 20 chars):', sellerSignature.substring(0, 20))
            return NextResponse.json(
                { success: false, message: 'Invalid seller signature - internal wallet mismatch' },
                { status: 403 }
            )
        }
        
        console.log('Seller signature verified successfully')

        // Check buyer's internal wallet balance before attempting purchase
        const connection = new Connection(
            process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
            'confirmed'
        )
        
        const buyerBalance = await connection.getBalance(buyerKeypair.publicKey)
        const buyerBalanceSOL = buyerBalance / LAMPORTS_PER_SOL
        const requiredAmount = listing.price + 0.001 // Price + estimated fees
        
        console.log(`Buyer internal wallet balance: ${buyerBalanceSOL.toFixed(4)} SOL`)
        console.log(`Required amount: ${requiredAmount.toFixed(4)} SOL`)
        
        if (buyerBalanceSOL < requiredAmount) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Insufficient balance in your internal wallet. Required: ${requiredAmount.toFixed(4)} SOL, Available: ${buyerBalanceSOL.toFixed(4)} SOL. Please send SOL to: ${buyerInternalAddress}`,
                    internalWalletAddress: buyerInternalAddress,
                    requiredAmount: requiredAmount,
                    currentBalance: buyerBalanceSOL,
                },
                { status: 400 }
            )
        }

        // Execute blockchain transactions
        console.log('Executing resale purchase...')
        const { nftTransferSignature, solTransferSignature } = await buyFromResale({
            nftMintAddress: listing.nftMintAddress,
            sellerKeypair: sellerKeypair,
            buyerKeypair: buyerKeypair,
            priceSOL: listing.price,
        })

        // Update listing status
        await prisma.listing.update({
            where: { id: listingId },
            data: {
                status: 'sold',
                soldTo: buyerWallet,
                soldAt: new Date(),
                transactionHash: nftTransferSignature, // Use NFT transfer as main transaction
            },
        })

        // Update ticket ownership - find ticket by nftMintAddress
        const ticket = await prisma.ticket.findUnique({
            where: {
                nftMintAddress: listing.nftMintAddress,
            },
        })

        if (ticket) {
            await prisma.ticket.update({
                where: { id: ticket.id },
                data: {
                    userId: buyer.id,
                },
            })
        }

        // Create order for buyer (for history)
        await prisma.order.create({
            data: {
                eventId: listing.eventId,
                userId: buyer.id,
                quantity: 1,
                totalPrice: listing.price,
                status: 'confirmed',
                transactionHash: nftTransferSignature,
            },
        })

        console.log('Resale purchase completed successfully')

        return NextResponse.json({
            success: true,
            transactionHash: nftTransferSignature,
            solTransferSignature: solTransferSignature,
            message: 'Ticket purchased successfully',
        })
    } catch (error: any) {
        console.error('Error purchasing resale ticket:', error)

        return NextResponse.json(
            {
                success: false,
                message: 'Failed to purchase ticket',
                error: error.message || String(error),
            },
            { status: 500 }
        )
    }
}

