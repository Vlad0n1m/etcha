import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isValidSolanaAddress } from '@/lib/utils/wallet'
import { PublicKey, Connection, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'

/**
 * POST /api/resale/prepare-buy
 * Prepare a resale purchase transaction for the buyer to sign
 * 
 * New flow:
 * 1. Buyer pays from their external wallet (Phantom) directly
 * 2. SOL goes to seller's internal (derived) wallet
 * 3. After confirmation, NFT transfers to buyer's external wallet
 * 
 * Body: { listingId: string, buyerWallet: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { listingId, buyerWallet } = body

        // Validation
        if (!listingId || !buyerWallet) {
            return NextResponse.json(
                { success: false, message: 'listingId and buyerWallet are required' },
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
                        title: true,
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

        // Check buyer is not the seller
        if (listing.seller.walletAddress === buyerWallet) {
            return NextResponse.json(
                { success: false, message: 'You cannot buy your own ticket' },
                { status: 400 }
            )
        }

        // Get seller's external wallet address (where SOL will be sent)
        // SOL goes to external wallet (Phantom) - that's where seller wants to receive money
        if (!listing.seller.walletAddress) {
            return NextResponse.json(
                { success: false, message: 'Seller wallet not found' },
                { status: 500 }
            )
        }

        // Check seller has internal wallet (for NFT storage) and signature (for NFT transfer)
        if (!listing.seller.internalWalletAddress) {
            return NextResponse.json(
                { success: false, message: 'Seller internal wallet not found (required for NFT transfer)' },
                { status: 500 }
            )
        }

        // Check seller signature exists
        if (!listing.sellerSignature) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Seller signature not found. This listing may have been created before signature storage was implemented.',
                },
                { status: 400 }
            )
        }

        // Create SOL transfer transaction from buyer's external wallet to seller's external wallet
        // Buyer pays from Phantom -> Seller receives in Phantom
        const connection = new Connection(
            process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
            'confirmed'
        )

        const buyerPublicKey = new PublicKey(buyerWallet)
        const sellerExternalPublicKey = new PublicKey(listing.seller.walletAddress)

        // Check buyer has enough balance
        const buyerBalance = await connection.getBalance(buyerPublicKey)
        const buyerBalanceSOL = buyerBalance / LAMPORTS_PER_SOL
        const requiredAmount = listing.price + 0.001 // Price + estimated fees

        if (buyerBalanceSOL < requiredAmount) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Insufficient balance. Required: ${requiredAmount.toFixed(4)} SOL, Available: ${buyerBalanceSOL.toFixed(4)} SOL`,
                    requiredAmount: requiredAmount,
                    currentBalance: buyerBalanceSOL,
                },
                { status: 400 }
            )
        }

        // Build the SOL transfer transaction
        // Buyer's Phantom -> Seller's Phantom (external to external)
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: buyerPublicKey,
                toPubkey: sellerExternalPublicKey,
                lamports: Math.floor(listing.price * LAMPORTS_PER_SOL),
            })
        )

        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
        transaction.recentBlockhash = blockhash
        transaction.feePayer = buyerPublicKey

        // Serialize the transaction for the client to sign
        const serializedTransaction = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        }).toString('base64')

        console.log('Prepared resale purchase transaction')
        console.log('Buyer (external):', buyerWallet)
        console.log('Seller (external):', listing.seller.walletAddress)
        console.log('Price:', listing.price, 'SOL')

        return NextResponse.json({
            success: true,
            transaction: serializedTransaction,
            listingId: listing.id,
            price: listing.price,
            sellerWallet: listing.seller.walletAddress, // External wallet for SOL
            sellerInternalWallet: listing.seller.internalWalletAddress, // Internal wallet for NFT
            nftMintAddress: listing.nftMintAddress,
            eventTitle: listing.event.title,
            lastValidBlockHeight,
        })
    } catch (error: any) {
        console.error('Error preparing resale purchase:', error)

        return NextResponse.json(
            {
                success: false,
                message: 'Failed to prepare purchase transaction',
                error: error.message || String(error),
            },
            { status: 500 }
        )
    }
}
