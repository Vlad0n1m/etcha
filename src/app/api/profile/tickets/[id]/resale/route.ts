import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { isValidSolanaAddress } from '@/lib/utils/wallet'

const prisma = new PrismaClient()

/**
 * POST /api/profile/tickets/[id]/resale
 * Create a resale listing for a ticket
 * Body: { price: number, walletAddress: string }
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params
        const ticketId = resolvedParams.id
        const body = await request.json()
        const { price, walletAddress } = body

        // Validation
        if (!walletAddress) {
            return NextResponse.json(
                { success: false, message: 'walletAddress is required' },
                { status: 400 }
            )
        }

        if (!isValidSolanaAddress(walletAddress)) {
            return NextResponse.json(
                { success: false, message: 'Invalid wallet address format' },
                { status: 400 }
            )
        }

        if (!price || typeof price !== 'number' || price <= 0) {
            return NextResponse.json(
                { success: false, message: 'Valid price in SOL is required' },
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

        // Get ticket with event information
        const ticket = await prisma.ticket.findUnique({
            where: {
                id: ticketId,
            },
            include: {
                event: {
                    select: {
                        id: true,
                        price: true,
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

        // Check if ticket is already on resale
        const existingListing = await prisma.listing.findUnique({
            where: {
                nftMintAddress: ticket.nftMintAddress,
            },
        })

        if (existingListing && existingListing.status === 'active') {
            return NextResponse.json(
                { success: false, message: 'This ticket is already listed for resale' },
                { status: 400 }
            )
        }

        // Check if event has passed
        const eventDate = new Date(ticket.event.date)
        const now = new Date()
        if (eventDate < now) {
            return NextResponse.json(
                { success: false, message: 'Cannot list tickets for past events' },
                { status: 400 }
            )
        }

        // Generate placeholder addresses for blockchain integration (will be replaced later)
        // For now, we'll use a deterministic address based on ticket ID
        const listingAddress = `listing_${ticketId}_${Date.now()}`
        const auctionHouseAddress = process.env.AUCTION_HOUSE_ADDRESS || 'placeholder_auction_house_address'

        // Create listing in database
        // Note: Blockchain integration will be added later via AuctionHouseService
        const listing = await prisma.listing.create({
            data: {
                nftMintAddress: ticket.nftMintAddress,
                eventId: ticket.eventId,
                sellerId: user.id,
                listingAddress: listingAddress,
                auctionHouseAddress: auctionHouseAddress,
                price: price,
                originalPrice: ticket.event.price,
                status: 'active',
                // transactionHash will be set when blockchain transaction is completed
            },
            include: {
                event: {
                    select: {
                        title: true,
                        imageUrl: true,
                    },
                },
            },
        })

        return NextResponse.json({
            success: true,
            listing: {
                id: listing.id,
                nftMintAddress: listing.nftMintAddress,
                price: listing.price,
                originalPrice: listing.originalPrice,
                listingAddress: listing.listingAddress,
                auctionHouseAddress: listing.auctionHouseAddress,
                status: listing.status,
                createdAt: listing.createdAt.toISOString(),
                event: {
                    title: listing.event.title,
                    imageUrl: listing.event.imageUrl,
                },
            },
            message: 'Ticket listed for resale successfully',
        })
    } catch (error: any) {
        console.error('Error creating resale listing:', error)
        
        // Handle unique constraint violation (ticket already listed)
        if (error.code === 'P2002') {
            return NextResponse.json(
                { success: false, message: 'This ticket is already listed for resale' },
                { status: 400 }
            )
        }

        return NextResponse.json(
            {
                success: false,
                message: 'Failed to create resale listing',
                error: error.message || String(error),
            },
            { status: 500 }
        )
    }
}
