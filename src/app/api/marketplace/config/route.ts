import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/marketplace/config
 * Get marketplace configuration (Auction House address)
 */
export async function GET(req: NextRequest) {
    try {
        const config = await prisma.platformConfig.findUnique({
            where: { key: 'AUCTION_HOUSE_ADDRESS' },
        });

        if (!config) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Marketplace not initialized',
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                auctionHouseAddress: config.value,
            },
        });
    } catch (error) {
        console.error('❌ Error fetching marketplace config:', error);
        return NextResponse.json(
            {
                success: false,
                error: `Failed to fetch marketplace config: ${(error as Error).message}`,
            },
            { status: 500 }
        );
    }
}
