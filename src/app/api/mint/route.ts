import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isValidSolanaAddress } from '@/lib/utils/wallet'
import { SolanaService } from '@/lib/solana/SolanaService'
import { BubblegumService } from '@/lib/solana/BubblegumService'
import { getPlatformTreeService } from '@/lib/solana/PlatformTreeService'
import { auth } from '@/lib/auth'

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
            ticketTypeId,
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

        // Get event from database with ticket types
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                organizer: {
                    include: {
                        user: true,
                    },
                },
                ticketTypes: {
                    orderBy: { sortOrder: 'asc' },
                },
            },
        })

        if (!event) {
            return NextResponse.json(
                { success: false, message: 'Event not found' },
                { status: 404 }
            )
        }

        // Get the ticket type
        let ticketType = null
        let pricePerTicket = event.price // Default to event price for legacy support

        if (ticketTypeId) {
            ticketType = event.ticketTypes.find(tt => tt.id === ticketTypeId)
            if (!ticketType) {
                return NextResponse.json(
                    { success: false, message: 'Ticket type not found' },
                    { status: 404 }
                )
            }
            pricePerTicket = ticketType.price

            // Check ticket type availability
            const ticketTypeRemaining = ticketType.quantity - ticketType.sold
            if (ticketTypeRemaining < quantity) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `Not enough ${ticketType.name} tickets available. Only ${ticketTypeRemaining} remaining.`,
                    },
                    { status: 400 }
                )
            }
        } else if (event.ticketTypes.length > 0) {
            // If event has ticket types but none was specified, use the first available
            ticketType = event.ticketTypes.find(tt => (tt.quantity - tt.sold) >= quantity)
            if (!ticketType) {
                return NextResponse.json(
                    { success: false, message: 'No ticket types available with requested quantity' },
                    { status: 400 }
                )
            }
            pricePerTicket = ticketType.price
        }

        // Check overall ticket availability
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

        // Check per-user ticket limit
        if (event.maxTicketsPerUser) {
            // Get user by wallet address
            const user = await prisma.user.findUnique({
                where: { walletAddress: buyerWallet },
            })

            if (user) {
                // Count existing tickets for this user and event
                const existingTicketCount = await prisma.ticket.count({
                    where: {
                        eventId,
                        userId: user.id,
                    },
                })

                const newTotal = existingTicketCount + quantity
                if (newTotal > event.maxTicketsPerUser) {
                    return NextResponse.json(
                        {
                            success: false,
                            message: `Ticket limit exceeded. Maximum ${event.maxTicketsPerUser} tickets per account. You already have ${existingTicketCount}.`,
                        },
                        { status: 400 }
                    )
                }
            }
        }

        console.log(`🌳 Preparing cNFT mint transaction for event: ${eventId}`)
        if (ticketType) {
            console.log(`Ticket type: ${ticketType.name} @ ${ticketType.price} SOL`)
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
        const platformTreeService = getPlatformTreeService()

        // Get shared platform ticket tree (auto-creates if not exists)
        let ticketTree
        try {
            ticketTree = await platformTreeService.getActiveTree('ticket')
            console.log('Using platform ticket tree:', ticketTree.address)
            console.log('Tree capacity:', ticketTree.available, 'remaining')
        } catch (treeError) {
            console.error('Error getting platform tree:', treeError)
            return NextResponse.json(
                {
                    success: false,
                    message: `Failed to get platform tree: ${treeError instanceof Error ? treeError.message : 'Unknown error'}`,
                },
                { status: 500 }
            )
        }

        if (!ticketTree.collectionAddress) {
            return NextResponse.json(
                { success: false, message: 'Platform ticket collection not initialized' },
                { status: 500 }
            )
        }

        if (ticketTree.available < quantity) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Not enough tree capacity. Only ${ticketTree.available} slots remaining.`,
                },
                { status: 400 }
            )
        }

        // Build mint transaction for the ticket
        const nextTicketNumber = event.ticketsSold + 1
        const ticketName = ticketType
            ? `${ticketType.name} #${String(nextTicketNumber).padStart(3, '0')}`
            : `Ticket #${String(nextTicketNumber).padStart(3, '0')}`

        const metadata = {
            name: ticketName,
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
        console.log('Price:', pricePerTicket)
        console.log('Payment destination:', organizerWallet)

        let result
        try {
            result = await bubblegumService.buildMintTransaction({
                merkleTree: ticketTree.address,
                collectionMint: ticketTree.collectionAddress,
                metadata,
                recipient: buyerWallet,
                priceInSol: pricePerTicket,
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
            merkleTreeAddress: ticketTree.address,
            platformTreeId: ticketTree.id,
            ticketTypeId: ticketType?.id || null,
            pricePerTicket,
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
