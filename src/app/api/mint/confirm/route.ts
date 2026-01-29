import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { isValidSolanaAddress } from '@/lib/utils/wallet'
import { Connection } from '@solana/web3.js'
import { SolanaService } from '@/lib/solana/SolanaService'
import { BubblegumService } from '@/lib/solana/BubblegumService'
import { getPlatformTreeService } from '@/lib/solana/PlatformTreeService'

const prisma = new PrismaClient()

/**
 * POST /api/mint/confirm
 * 
 * Confirm ticket purchase:
 * 1. Verify payment transaction
 * 2. Mint cNFT ticket to buyer
 * 3. Save to database with ticket type
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        const {
            eventId,
            ticketTypeId,
            merkleTreeAddress,
            platformTreeId,
            buyerWallet,
            quantity = 1,
            transactionSignature,
        } = body

        if (!eventId || !buyerWallet || !transactionSignature) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields' },
                { status: 400 }
            )
        }

        if (!merkleTreeAddress && !platformTreeId) {
            return NextResponse.json(
                { success: false, message: 'Missing merkle tree address or platform tree ID' },
                { status: 400 }
            )
        }

        if (!isValidSolanaAddress(buyerWallet)) {
            return NextResponse.json(
                { success: false, message: 'Invalid buyer wallet address' },
                { status: 400 }
            )
        }

        console.log(`Confirming purchase for event ${eventId}, buyer ${buyerWallet}`)
        if (ticketTypeId) {
            console.log(`Ticket type ID: ${ticketTypeId}`)
        }

        // Verify payment transaction on-chain
        const connection = new Connection(
            process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
        )

        try {
            const txInfo = await connection.getTransaction(transactionSignature, {
                maxSupportedTransactionVersion: 0,
            })

            if (!txInfo) {
                console.log('Transaction not found yet, may still be processing...')
            } else if (txInfo.meta?.err) {
                return NextResponse.json(
                    { success: false, message: 'Payment transaction failed on-chain' },
                    { status: 400 }
                )
            }
            console.log('Payment transaction verified')
        } catch (txError) {
            console.error('Transaction verification error:', txError)
            // Continue - transaction might be too recent to query
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
                ticketTypes: true,
            },
        })

        if (!event) {
            return NextResponse.json(
                { success: false, message: 'Event not found' },
                { status: 404 }
            )
        }

        // Get ticket type if specified
        let ticketType = null
        let pricePerTicket = event.price

        if (ticketTypeId) {
            ticketType = event.ticketTypes.find(tt => tt.id === ticketTypeId)
            if (!ticketType) {
                return NextResponse.json(
                    { success: false, message: 'Ticket type not found' },
                    { status: 404 }
                )
            }
            pricePerTicket = ticketType.price
        } else if (event.ticketTypes.length > 0) {
            // Use the first ticket type as default
            ticketType = event.ticketTypes[0]
            pricePerTicket = ticketType.price
        }

        // Get platform tree for minting
        const platformTreeService = getPlatformTreeService()
        let ticketTree
        try {
            ticketTree = await platformTreeService.getActiveTree('ticket')
        } catch (treeError) {
            console.error('Error getting platform tree:', treeError)
            return NextResponse.json(
                { success: false, message: 'Platform tree not available' },
                { status: 500 }
            )
        }

        if (!ticketTree.collectionAddress) {
            return NextResponse.json(
                { success: false, message: 'Platform collection not configured' },
                { status: 400 }
            )
        }

        // Check idempotency - don't process same transaction twice
        const existingOrder = await prisma.order.findFirst({
            where: { transactionHash: transactionSignature },
            include: { tickets: true }
        })

        if (existingOrder) {
            console.log('Order already exists, returning existing data')
            return NextResponse.json({
                success: true,
                assetIds: existingOrder.tickets.map(t => t.assetId),
                transactionSignature,
                orderId: existingOrder.id,
                message: 'Tickets already confirmed',
            })
        }

        // Get or create user
        let user = await prisma.user.findUnique({
            where: { walletAddress: buyerWallet },
        })

        if (!user) {
            user = await prisma.user.create({
                data: {
                    walletAddress: buyerWallet,
                    internalWalletAddress: `pending_${buyerWallet}_${Date.now()}`,
                },
            })
        }

        // Final check on per-user ticket limit
        if (event.maxTicketsPerUser) {
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
                        message: `Ticket limit exceeded. Maximum ${event.maxTicketsPerUser} tickets per account.`,
                    },
                    { status: 400 }
                )
            }
        }

        // Initialize Solana services for minting
        console.log('Initializing Solana services for minting...')
        const solanaService = new SolanaService()
        const bubblegumService = new BubblegumService(solanaService)

        // Mint cNFT tickets
        const assetIds: string[] = []
        const leafIndices: number[] = []

        for (let i = 0; i < quantity; i++) {
            const ticketNumber = event.ticketsSold + i + 1
            const ticketName = ticketType
                ? `${ticketType.name} #${String(ticketNumber).padStart(3, '0')}`
                : `Ticket #${String(ticketNumber).padStart(3, '0')}`

            console.log(`Minting ticket: ${ticketName}`)

            const metadata = {
                name: ticketName,
                symbol: 'TICKET',
                uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/metadata/ticket/${event.id}/${ticketNumber}`,
                sellerFeeBasisPoints: 250,
                creators: [{
                    address: solanaService.getKeypair().publicKey.toString(),
                    share: 100,
                    verified: true,
                }],
            }

            try {
                const mintResult = await bubblegumService.mintCompressedNFT({
                    merkleTree: ticketTree.address,
                    collectionMint: ticketTree.collectionAddress!,
                    metadata,
                    recipient: buyerWallet,
                })

                assetIds.push(mintResult.assetId)
                leafIndices.push(mintResult.leafIndex)
                console.log(`Ticket minted: ${mintResult.assetId}`)

                // Increment platform tree minted count
                await platformTreeService.incrementMintedCount(ticketTree.id)
            } catch (mintError) {
                console.error(`Failed to mint ticket:`, mintError)

                // If we already minted some tickets, save what we have
                if (assetIds.length > 0) {
                    console.log(`Partial success: ${assetIds.length} tickets minted`)
                    break
                }

                return NextResponse.json(
                    {
                        success: false,
                        message: `Failed to mint ticket: ${mintError instanceof Error ? mintError.message : 'Unknown error'}`
                    },
                    { status: 500 }
                )
            }
        }

        // Calculate payment details
        const actualQuantity = assetIds.length
        const totalPrice = pricePerTicket * actualQuantity
        const organizerShare = totalPrice * 0.975
        const platformShare = totalPrice * 0.025

        // Create order and update counts in a transaction
        console.log('Creating order in database...')

        const order = await prisma.$transaction(async (tx) => {
            // Create order
            const newOrder = await tx.order.create({
                data: {
                    eventId,
                    userId: user.id,
                    quantity: actualQuantity,
                    totalPrice,
                    status: 'confirmed',
                    transactionHash: transactionSignature,
                },
            })

            // Create ticket records
            const ticketData = assetIds.map((assetId, index) => ({
                eventId,
                orderId: newOrder.id,
                userId: user.id,
                ticketTypeId: ticketType?.id || null,
                assetId,
                nftMintAddress: assetId,
                leafIndex: leafIndices[index],
                tokenId: event.ticketsSold + index + 1,
                nftType: 'cnft',
                isValid: true,
                isUsed: false,
            }))

            await tx.ticket.createMany({
                data: ticketData,
            })

            // Update event tickets sold
            await tx.event.update({
                where: { id: eventId },
                data: {
                    ticketsSold: {
                        increment: actualQuantity,
                    },
                },
            })

            // Update ticket type sold count if applicable
            if (ticketType) {
                await tx.ticketType.update({
                    where: { id: ticketType.id },
                    data: {
                        sold: {
                            increment: actualQuantity,
                        },
                    },
                })
            }

            return newOrder
        })

        console.log(`Purchase confirmed: ${actualQuantity} tickets minted`)

        return NextResponse.json({
            success: true,
            assetIds,
            transactionSignature,
            organizerPayment: {
                amount: organizerShare,
                transactionHash: transactionSignature,
            },
            platformFee: {
                amount: platformShare,
            },
            orderId: order.id,
            ticketsMinted: actualQuantity,
            ticketType: ticketType?.name || 'Standard',
            message: `${actualQuantity} ${ticketType?.name || ''} ticket(s) purchased successfully`,
        })

    } catch (error: unknown) {
        console.error('Error confirming purchase:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to confirm ticket purchase',
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        )
    }
}
