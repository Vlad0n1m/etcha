import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { isValidSolanaAddress } from '@/lib/utils/wallet'

const prisma = new PrismaClient()

/**
 * GET /api/profile/tickets?walletAddress=<external_wallet>
 * Get all NFT tickets minted to user's internal wallet
 */
export async function GET(request: NextRequest) {
    try {
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
            return NextResponse.json({
                success: true,
                tickets: [],
                message: 'User not found',
            })
        }

        // Get all tickets for this user with related data
        const tickets = await prisma.ticket.findMany({
            where: {
                userId: user.id,
            },
            include: {
                event: {
                    include: {
                        category: true,
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
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        // Get all listings to check which tickets are on resale
        const allListings = await prisma.listing.findMany({
            where: {
                status: 'active',
            },
            select: {
                nftMintAddress: true,
                price: true,
                originalPrice: true,
            },
        })

        // Create a map of listings for quick lookup
        const listingsMap = new Map(
            allListings.map(listing => [listing.nftMintAddress, listing])
        )

        // Transform tickets to include listing info and determine status
        const now = new Date()
        const transformedTickets = tickets.map(ticket => {
            const listing = listingsMap.get(ticket.nftMintAddress)
            const eventDate = new Date(ticket.event.date)
            const isPastEvent = eventDate < now
            const isOnResale = !!listing

            // Determine status
            let status: 'bought' | 'on_resale' | 'passed' | 'nft' = 'bought'
            if (isOnResale) {
                status = 'on_resale'
            } else if (isPastEvent) {
                status = 'passed'
            } else {
                // Active tickets that are not on resale - use 'bought' or 'nft' depending on your preference
                // Using 'bought' for consistency with original mock data
                status = 'bought'
            }

            return {
                id: ticket.id,
                nftId: ticket.nftMintAddress,
                eventTitle: ticket.event.title,
                eventImage: ticket.event.imageUrl,
                date: ticket.event.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
                time: ticket.event.time,
                location: ticket.event.fullAddress,
                price: ticket.order.quantity > 0 
                    ? ticket.order.totalPrice / ticket.order.quantity 
                    : ticket.event.price, // Price per ticket
                originalPrice: ticket.event.price,
                marketPrice: listing ? listing.price : ticket.event.price,
                status: status,
                tokenId: ticket.tokenId,
                isValid: ticket.isValid,
                isUsed: ticket.isUsed,
                createdAt: ticket.createdAt.toISOString(),
                transactionHash: ticket.order.transactionHash,
            }
        })

        return NextResponse.json({
            success: true,
            tickets: transformedTickets,
        })
    } catch (error: any) {
        console.error('Error fetching user tickets:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to fetch tickets',
                error: error.message || String(error),
            },
            { status: 500 }
        )
    }
}

