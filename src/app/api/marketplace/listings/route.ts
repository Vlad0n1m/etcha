import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/marketplace/listings
 * Get all active listings with optional filters
 * Query params: eventId (optional), status (optional)
 */
export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const eventId = searchParams.get('eventId');
        const status = searchParams.get('status') || 'active';

        // Build query
        const where: any = { status };
        if (eventId) {
            where.eventId = eventId;
        }

        const listings = await prisma.listing.findMany({
            where,
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        imageUrl: true,
                        date: true,
                        time: true,
                        fullAddress: true,
                        price: true,
                        category: {
                            select: {
                                name: true,
                                value: true,
                            },
                        },
                    },
                },
                seller: {
                    select: {
                        walletAddress: true,
                        profile: {
                            select: {
                                nickname: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Add price comparison
        const listingsWithComparison = listings.map((listing) => {
            const priceDiff = listing.price - listing.originalPrice;
            let priceComparison: 'cheaper' | 'same' | 'higher';

            if (priceDiff < 0) priceComparison = 'cheaper';
            else if (priceDiff > 0) priceComparison = 'higher';
            else priceComparison = 'same';

            return {
                ...listing,
                priceComparison,
                priceDifference: priceDiff,
                sellerNickname: listing.seller.profile?.nickname || 'Anonymous',
            };
        });

        return NextResponse.json({
            success: true,
            data: {
                listings: listingsWithComparison,
                count: listingsWithComparison.length,
            },
        });
    } catch (error) {
        console.error('❌ Error fetching listings:', error);
        return NextResponse.json(
            {
                success: false,
                error: `Failed to fetch listings: ${(error as Error).message}`,
            },
            { status: 500 }
        );
    }
}

/**
 * POST /api/marketplace/listings
 * Create a new listing (after transaction is signed on frontend)
 * Body: { nftMintAddress, price, eventId, sellerWallet, listingAddress, transactionHash }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { nftMintAddress, price, eventId, sellerWallet, listingAddress, transactionHash } = body;

        // Validate inputs
        if (!nftMintAddress || !price || !eventId || !sellerWallet || !listingAddress || !transactionHash) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: nftMintAddress, price, eventId, sellerWallet, listingAddress, transactionHash',
                },
                { status: 400 }
            );
        }

        if (price <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Price must be greater than 0',
                },
                { status: 400 }
            );
        }

        // Get auction house address
        const config = await prisma.platformConfig.findUnique({
            where: { key: 'AUCTION_HOUSE_ADDRESS' },
        });

        if (!config) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Marketplace not initialized',
                },
                { status: 400 }
            );
        }

        // Verify user owns this NFT
        const ticket = await prisma.ticket.findUnique({
            where: { nftMintAddress },
        });

        if (!ticket) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'NFT ticket not found',
                },
                { status: 404 }
            );
        }

        // Verify seller is the owner
        const user = await prisma.user.findUnique({
            where: { walletAddress: sellerWallet },
        });

        if (!user || ticket.userId !== user.id) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'You do not own this NFT',
                },
                { status: 403 }
            );
        }

        // Check if NFT is already listed
        const existingListing = await prisma.listing.findFirst({
            where: {
                nftMintAddress,
                status: 'active',
            },
        });

        if (existingListing) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'This NFT is already listed for sale',
                },
                { status: 400 }
            );
        }

        // Get event to get original price
        const event = await prisma.event.findUnique({
            where: { id: eventId },
        });

        if (!event) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Event not found',
                },
                { status: 404 }
            );
        }

        // Save to database (transaction already signed and sent on frontend)
        const listing = await prisma.listing.create({
            data: {
                nftMintAddress,
                eventId,
                sellerId: user.id,
                listingAddress,
                auctionHouseAddress: config.value,
                price,
                originalPrice: event.price,
                status: 'active',
                transactionHash,
            },
            include: {
                event: {
                    select: {
                        title: true,
                        imageUrl: true,
                    },
                },
            },
        });

        console.log('✅ Listing created successfully:', listing.id);

        return NextResponse.json({
            success: true,
            data: {
                listing,
                message: 'Listing created successfully',
            },
        });
    } catch (error) {
        console.error('❌ Error creating listing:', error);
        return NextResponse.json(
            {
                success: false,
                error: `Failed to create listing: ${(error as Error).message}`,
            },
            { status: 500 }
        );
    }
}

