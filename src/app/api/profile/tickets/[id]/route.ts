import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { isValidSolanaAddress } from '@/lib/utils/wallet'

const prisma = new PrismaClient()

/**
 * GET /api/profile/tickets/[id]?walletAddress=<external_wallet>
 * Get detailed information about a specific ticket
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params
        const ticketId = resolvedParams.id
        const searchParams = request.nextUrl.searchParams
        const walletAddress = searchParams.get('walletAddress')

        if (!walletAddress) {
            return NextResponse.json(
                { success: false, message: 'walletAddress is required' },
                { status: 400 }
            )
        }

        // Validate wallet address
        if (!isValidSolanaAddress(walletAddress)) {
            return NextResponse.json(
                { success: false, message: 'Invalid wallet address format' },
                { status: 400 }
            )
        }

        // Find user by external wallet address
        const user = await prisma.user.findUnique({
            where: {
                walletAddress: walletAddress,
            },
            select: {
                id: true,
                internalWalletAddress: true,
            },
        })

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            )
        }

        // Get ticket with all related data
        const ticket = await prisma.ticket.findUnique({
            where: {
                id: ticketId,
            },
            include: {
                event: {
                    include: {
                        category: true,
                        organizer: {
                            include: {
                                user: {
                                    select: {
                                        walletAddress: true,
                                    },
                                },
                            },
                        },
                    },
                },
                order: {
                    select: {
                        totalPrice: true,
                        quantity: true,
                        status: true,
                        transactionHash: true,
                        createdAt: true,
                    },
                },
                user: {
                    select: {
                        walletAddress: true,
                        internalWalletAddress: true,
                    },
                },
            },
        })

        if (!ticket) {
            return NextResponse.json(
                { success: false, message: 'Ticket not found' },
                { status: 404 }
            )
        }

        // Verify ownership
        if (ticket.userId !== user.id) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized: You do not own this ticket' },
                { status: 403 }
            )
        }

        // Check if ticket is on resale
        const listing = await prisma.listing.findUnique({
            where: {
                nftMintAddress: ticket.nftMintAddress,
            },
        })

        // Determine status
        const now = new Date()
        const eventDate = new Date(ticket.event.date)
        const isPastEvent = eventDate < now
        const isOnResale = !!listing && listing.status === 'active'

        let status: 'bought' | 'on_resale' | 'passed' | 'nft' = 'bought'
        if (isOnResale) {
            status = 'on_resale'
        } else if (isPastEvent) {
            status = 'passed'
        } else {
            status = 'bought'
        }

        // Calculate price per ticket
        // If order.totalPrice is 0 or invalid, fall back to event price
        // This can happen if order was created before proper price tracking
        let pricePerTicket = ticket.event.price
        if (ticket.order.totalPrice > 0 && ticket.order.quantity > 0) {
            pricePerTicket = ticket.order.totalPrice / ticket.order.quantity
        }

        // Format response
        const response = {
            success: true,
            ticket: {
                id: ticket.id,
                nftMintAddress: ticket.nftMintAddress,
                tokenId: ticket.tokenId,
                metadataUri: ticket.metadataUri,
                isValid: ticket.isValid,
                isUsed: ticket.isUsed,
                status: status,
                createdAt: ticket.createdAt.toISOString(),
                price: pricePerTicket,
                originalPrice: ticket.event.price,
                marketPrice: listing ? listing.price : ticket.event.price,
                // Event information
                event: {
                    id: ticket.event.id,
                    title: ticket.event.title,
                    description: ticket.event.description,
                    imageUrl: ticket.event.imageUrl,
                    date: ticket.event.date.toISOString().split('T')[0],
                    time: ticket.event.time,
                    fullAddress: ticket.event.fullAddress,
                    category: ticket.event.category.name,
                    organizer: ticket.event.organizer ? {
                        name: ticket.event.organizer.companyName,
                        walletAddress: ticket.event.organizer.user.walletAddress,
                    } : null,
                },
                // Order information
                order: {
                    id: ticket.orderId,
                    totalPrice: ticket.order.totalPrice,
                    quantity: ticket.order.quantity,
                    status: ticket.order.status,
                    transactionHash: ticket.order.transactionHash,
                    createdAt: ticket.order.createdAt.toISOString(),
                },
                // Listing information (if on resale)
                listing: listing ? {
                    id: listing.id,
                    price: listing.price,
                    originalPrice: listing.originalPrice,
                    listingAddress: listing.listingAddress,
                    auctionHouseAddress: listing.auctionHouseAddress,
                    status: listing.status,
                    createdAt: listing.createdAt.toISOString(),
                } : null,
            },
        }

        return NextResponse.json(response)
    } catch (error: any) {
        console.error('Error fetching ticket details:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to fetch ticket details',
                error: error.message || String(error),
            },
            { status: 500 }
        )
    }
}
