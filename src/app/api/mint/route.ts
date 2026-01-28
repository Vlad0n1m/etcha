import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { isValidSolanaAddress } from '@/lib/utils/wallet'
import { SolanaService } from '@/lib/solana/SolanaService'
import { BubblegumService } from '@/lib/solana/BubblegumService'

const prisma = new PrismaClient()

/**
 * POST /api/mint
 * 
 * Mint cNFT ticket(s) using Bubblegum with Merkle tree
 * 98% cheaper than traditional NFT minting!
 * 
 * Automatically distributes payment: 97.5% to organizer, 2.5% to platform
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate required fields
        const {
            eventId,
            buyerWallet,
            quantity = 1,
        } = body

        if (!eventId || !buyerWallet) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields: eventId, buyerWallet' },
                { status: 400 }
            )
        }

        // Validate buyer wallet address
        if (!isValidSolanaAddress(buyerWallet)) {
            return NextResponse.json(
                { success: false, message: 'Invalid buyer wallet address' },
                { status: 400 }
            )
        }

        // Validate quantity
        if (quantity < 1 || quantity > 10) {
            return NextResponse.json(
                { success: false, message: 'Quantity must be between 1 and 10' },
                { status: 400 }
            )
        }

        // Get event from database
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                organizer: {
                    include: {
                        user: true,
                    },
                },
            },
        })

        if (!event) {
            return NextResponse.json(
                { success: false, message: 'Event not found' },
                { status: 404 }
            )
        }

        // Check ticket availability
        const ticketsRemaining = event.ticketsAvailable - event.ticketsSold
        if (ticketsRemaining < quantity) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Not enough tickets available. Only ${ticketsRemaining} remaining.`,
                },
                { status: 400 }
            )
        }

        console.log(`🌳 Preparing cNFT mint transaction for event: ${eventId}`)

        // Validate cNFT infrastructure
        if (!event.merkleTreeAddress) {
            return NextResponse.json(
                { success: false, message: 'Merkle tree not configured for this event' },
                { status: 400 }
            )
        }

        if (!event.collectionNftAddress) {
            return NextResponse.json(
                { success: false, message: 'Collection NFT not configured for this event' },
                { status: 400 }
            )
        }

        const organizerWallet = event.organizer?.user?.walletAddress
        if (!organizerWallet) {
            return NextResponse.json(
                { success: false, message: 'Organizer wallet not found' },
                { status: 400 }
            )
        }

        // Initialize services
        console.log('Initializing Solana services...')
        const solanaService = new SolanaService()
        const bubblegumService = new BubblegumService(solanaService)

        // Get tree stats to check availability
        console.log('Getting tree stats for:', event.merkleTreeAddress)
        let treeStats
        try {
            treeStats = await bubblegumService.getTreeStats(event.merkleTreeAddress)
            console.log('Tree stats:', treeStats)
        } catch (treeError) {
            console.error('Error getting tree stats:', treeError)
            return NextResponse.json(
                {
                    success: false,
                    message: `Failed to get tree stats: ${treeError instanceof Error ? treeError.message : 'Unknown error'}`,
                },
                { status: 500 }
            )
        }

        if (treeStats.remaining < quantity) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Not enough capacity. Only ${treeStats.remaining} tickets remaining.`,
                },
                { status: 400 }
            )
        }

        // Build mint transaction for the ticket
        const nextTicketNumber = event.ticketsSold + 1
        const metadata = {
            name: `Ticket #${String(nextTicketNumber).padStart(3, '0')}`,
            symbol: 'TICKET',
            uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/metadata/ticket/${event.id}/${nextTicketNumber}`,
            sellerFeeBasisPoints: 250,
            creators: [{
                address: solanaService.getKeypair().publicKey.toString(),
                share: 100,
                verified: true,
            }],
        }

        console.log('Building mint transaction...')
        console.log('Metadata:', metadata)
        console.log('Recipient:', buyerWallet)
        console.log('Price:', event.price)
        console.log('Payment destination:', organizerWallet)

        let result
        try {
            result = await bubblegumService.buildMintTransaction({
                merkleTree: event.merkleTreeAddress,
                collectionMint: event.collectionNftAddress,
                metadata,
                recipient: buyerWallet,
                priceInSol: event.price,
                paymentDestination: organizerWallet,
            })
            console.log('Transaction built successfully')
        } catch (buildError) {
            console.error('Error building mint transaction:', buildError)
            return NextResponse.json(
                {
                    success: false,
                    message: `Failed to build transaction: ${buildError instanceof Error ? buildError.message : 'Unknown error'}`,
                },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            transaction: result.transaction,
            assetIds: [result.expectedAssetId],
            merkleTreeAddress: event.merkleTreeAddress,
            message: 'Ticket purchase transaction ready',
        })

    } catch (error: unknown) {
        console.error('Error preparing mint transaction:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to prepare purchase',
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        )
    }
}
