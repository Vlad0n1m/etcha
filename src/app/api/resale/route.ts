import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'

const prisma = new PrismaClient()

/**
 * GET /api/resale
 * Get all active resale listings
 * Returns listings with event, seller, and category information
 */
export async function GET(request: NextRequest) {
    try {
        const now = new Date()

        // Get all active listings with related data
        const listings = await prisma.listing.findMany({
            where: {
                status: 'active',
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
                seller: {
                    include: {
                        profile: true,
                        organizer: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        // Filter out past events
        const activeListings = listings.filter((listing) => {
            const eventDate = new Date(listing.event.date)
            return eventDate >= now
        })

        // Format response to match ResaleTicket interface
        const formattedListings = activeListings.map((listing) => {
            // Get seller display name
            let sellerName = listing.seller.walletAddress
            if (listing.seller.organizer?.companyName) {
                sellerName = listing.seller.organizer.companyName
            } else if (listing.seller.profile?.nickname) {
                sellerName = listing.seller.profile.nickname
            }

            return {
                listingId: listing.id,
                nftMintAddress: listing.nftMintAddress,
                price: listing.price,
                originalPrice: listing.originalPrice,
                event: {
                    id: listing.event.id,
                    title: listing.event.title,
                    imageUrl: listing.event.imageUrl,
                    date: listing.event.date.toISOString(),
                    time: listing.event.time,
                    fullAddress: listing.event.fullAddress,
                    category: listing.event.category.name,
                    organizer: listing.event.organizer
                        ? {
                              name: listing.event.organizer.companyName,
                              walletAddress: listing.event.organizer.user.walletAddress,
                          }
                        : null,
                },
                seller: {
                    walletAddress: listing.seller.walletAddress,
                    nickname: listing.seller.profile?.nickname || undefined,
                    organizer: listing.seller.organizer
                        ? {
                              companyName: listing.seller.organizer.companyName,
                          }
                        : undefined,
                },
            }
        })

        return NextResponse.json({
            success: true,
            listings: formattedListings,
            count: formattedListings.length,
        })
    } catch (error: any) {
        console.error('Error fetching resale listings:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to fetch resale listings',
                error: error.message || String(error),
            },
            { status: 500 }
        )
    }
}

