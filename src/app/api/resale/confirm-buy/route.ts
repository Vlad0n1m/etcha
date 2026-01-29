import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { transferNFTToBuyer } from '@/lib/services/AuctionHouseService'
import { isValidSolanaAddress } from '@/lib/utils/wallet'
import { deriveKeypairFromSignature, getDerivationSalt } from '@/lib/utils/keyDerivation.server'
import { PublicKey, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js'

const prisma = new PrismaClient()

/**
 * POST /api/resale/confirm-buy
 * Confirm the SOL payment and transfer NFT to buyer's external wallet
 * 
 * New flow:
 * 1. Client already signed and sent SOL payment from Phantom
 * 2. This endpoint verifies the payment arrived
 * 3. Then transfers NFT from seller's internal wallet to buyer's external wallet
 * 
 * Body: { listingId: string, buyerWallet: string, paymentSignature: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { listingId, buyerWallet, paymentSignature } = body

        // Validation
        if (!listingId || !buyerWallet || !paymentSignature) {
            return NextResponse.json(
                { success: false, message: 'listingId, buyerWallet, and paymentSignature are required' },
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
                sellerId: true,
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

        // Check if listing is still active
        if (listing.status !== 'active') {
            return NextResponse.json(
                { success: false, message: 'This ticket is no longer available for purchase' },
                { status: 400 }
            )
        }

        // Verify seller has internal wallet and signature
        if (!listing.seller.internalWalletAddress) {
            return NextResponse.json(
                { success: false, message: 'Seller internal wallet not found' },
                { status: 500 }
            )
        }

        if (!listing.sellerSignature) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Seller signature not found in listing.',
                },
                { status: 400 }
            )
        }

        // Connect to Solana
        const connection = new Connection(
            process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
            'confirmed'
        )

        // Verify the payment transaction
        console.log('Verifying payment transaction:', paymentSignature)

        const txInfo = await connection.getTransaction(paymentSignature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
        })

        if (!txInfo) {
            return NextResponse.json(
                { success: false, message: 'Payment transaction not found or not confirmed yet. Please wait and try again.' },
                { status: 400 }
            )
        }

        if (txInfo.meta?.err) {
            return NextResponse.json(
                { success: false, message: 'Payment transaction failed on chain' },
                { status: 400 }
            )
        }

        // Verify the payment was sent to the correct address (seller's external wallet)
        // SOL goes to external wallet (Phantom) - that's where seller wants to receive money
        const sellerExternalPubkey = new PublicKey(listing.seller.walletAddress)
        const expectedLamports = Math.floor(listing.price * LAMPORTS_PER_SOL)

        // Check post balances to verify seller received the payment
        const accountKeys = txInfo.transaction.message.getAccountKeys()
        const sellerIndex = accountKeys.staticAccountKeys.findIndex(
            (key) => key.toBase58() === listing.seller.walletAddress
        )

        if (sellerIndex === -1) {
            return NextResponse.json(
                { success: false, message: 'Payment was not sent to the correct seller wallet' },
                { status: 400 }
            )
        }

        // Verify the amount transferred (check balance change)
        const preBalance = txInfo.meta?.preBalances?.[sellerIndex] || 0
        const postBalance = txInfo.meta?.postBalances?.[sellerIndex] || 0
        const actualTransfer = postBalance - preBalance

        // Allow 1% tolerance for any rounding
        const minExpected = expectedLamports * 0.99
        if (actualTransfer < minExpected) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Insufficient payment. Expected: ${listing.price} SOL, Received: ${actualTransfer / LAMPORTS_PER_SOL} SOL`
                },
                { status: 400 }
            )
        }

        console.log('Payment verified successfully')
        console.log('Expected:', expectedLamports, 'lamports')
        console.log('Received:', actualTransfer, 'lamports')

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

        if (!buyer) {
            buyer = await prisma.user.create({
                data: {
                    walletAddress: buyerWallet,
                },
                select: {
                    id: true,
                    internalWalletAddress: true,
                },
            })
        }

        // Derive seller keypair from stored signature
        const salt = getDerivationSalt()
        console.log('Deriving seller keypair from signature...')

        const sellerKeypair = deriveKeypairFromSignature(
            listing.sellerSignature,
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
            return NextResponse.json(
                { success: false, message: 'Invalid seller signature - internal wallet mismatch' },
                { status: 403 }
            )
        }

        // Transfer NFT from seller's internal wallet to buyer's external wallet
        console.log('Transferring NFT to buyer external wallet:', buyerWallet)

        const nftTransferSignature = await transferNFTToBuyer({
            nftMintAddress: listing.nftMintAddress,
            sellerKeypair: sellerKeypair,
            buyerPublicKey: new PublicKey(buyerWallet), // External wallet!
        })

        console.log('NFT transferred successfully:', nftTransferSignature)

        // Update listing status
        await prisma.listing.update({
            where: { id: listingId },
            data: {
                status: 'sold',
                soldTo: buyerWallet,
                soldAt: new Date(),
                transactionHash: nftTransferSignature,
            },
        })

        // Update ticket ownership
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
            nftTransferSignature,
            paymentSignature,
            message: 'Ticket purchased successfully! NFT has been transferred to your wallet.',
        })
    } catch (error: any) {
        console.error('Error confirming resale purchase:', error)

        return NextResponse.json(
            {
                success: false,
                message: 'Failed to complete purchase',
                error: error.message || String(error),
            },
            { status: 500 }
        )
    }
}
