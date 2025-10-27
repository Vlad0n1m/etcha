import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { MarketplaceService } from '@/lib/solana/MarketplaceService';
import { SolanaService } from '@/lib/solana/SolanaService';
import { prisma } from '@/lib/db';

/**
 * DELETE /api/marketplace/listings/[id]
 * Cancel a listing
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const listingId = params.id;
        const body = await req.json();
        const { sellerWallet } = body;

        if (!sellerWallet) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing sellerWallet',
                },
                { status: 400 }
            );
        }

        // Get listing
        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            include: {
                seller: true,
            },
        });

        if (!listing) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Listing not found',
                },
                { status: 404 }
            );
        }

        // Verify seller owns this listing
        if (listing.seller.walletAddress !== sellerWallet) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'You do not own this listing',
                },
                { status: 403 }
            );
        }

        // Check if already cancelled or sold
        if (listing.status !== 'active') {
            return NextResponse.json(
                {
                    success: false,
                    error: `Listing is already ${listing.status}`,
                },
                { status: 400 }
            );
        }

        // Cancel listing on blockchain
        const solanaService = new SolanaService();
        const marketplaceService = new MarketplaceService(solanaService);

        const sellerPublicKey = new PublicKey(sellerWallet);
        const cancelResult = await marketplaceService.cancelListing(
            listing.auctionHouseAddress,
            listing.listingAddress,
            sellerPublicKey
        );

        // Update database
        const updatedListing = await prisma.listing.update({
            where: { id: listingId },
            data: {
                status: 'cancelled',
                transactionHash: cancelResult.transaction,
            },
        });

        console.log('✅ Listing cancelled successfully:', listingId);

        return NextResponse.json({
            success: true,
            data: {
                listing: updatedListing,
                message: 'Listing cancelled successfully',
            },
        });
    } catch (error) {
        console.error('❌ Error cancelling listing:', error);
        return NextResponse.json(
            {
                success: false,
                error: `Failed to cancel listing: ${(error as Error).message}`,
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/marketplace/listings/[id]
 * Get a specific listing by ID
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const listingId = params.id;

        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
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
        });

        if (!listing) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Listing not found',
                },
                { status: 404 }
            );
        }

        // Add price comparison
        const priceDiff = listing.price - listing.originalPrice;
        let priceComparison: 'cheaper' | 'same' | 'higher';

        if (priceDiff < 0) priceComparison = 'cheaper';
        else if (priceDiff > 0) priceComparison = 'higher';
        else priceComparison = 'same';

        return NextResponse.json({
            success: true,
            data: {
                listing: {
                    ...listing,
                    priceComparison,
                    priceDifference: priceDiff,
                    sellerNickname: listing.seller.profile?.nickname || 'Anonymous',
                },
            },
        });
    } catch (error) {
        console.error('❌ Error fetching listing:', error);
        return NextResponse.json(
            {
                success: false,
                error: `Failed to fetch listing: ${(error as Error).message}`,
            },
            { status: 500 }
        );
    }
}

