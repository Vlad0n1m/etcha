import { NextRequest, NextResponse } from 'next/server';
import { MarketplaceService } from '@/lib/solana/MarketplaceService';
import { SolanaService } from '@/lib/solana/SolanaService';
import { prisma } from '@/lib/db';

/**
 * POST /api/marketplace/init
 * One-time marketplace initialization - creates Auction House
 * Only platform admin should call this
 */
export async function POST(req: NextRequest) {
    try {
        console.log('🏪 Initializing marketplace...');

        // Check if marketplace already exists
        const existingConfig = await prisma.platformConfig.findUnique({
            where: { key: 'AUCTION_HOUSE_ADDRESS' },
        });

        if (existingConfig) {
            return NextResponse.json({
                success: true,
                data: {
                    auctionHouseAddress: existingConfig.value,
                    message: 'Marketplace already initialized',
                },
            });
        }

        // Create marketplace
        const solanaService = new SolanaService();
        const marketplaceService = new MarketplaceService(solanaService);

        const auctionHouseAddress = await marketplaceService.createMarketplace();

        // Save to database
        await prisma.platformConfig.create({
            data: {
                key: 'AUCTION_HOUSE_ADDRESS',
                value: auctionHouseAddress,
            },
        });

        console.log('✅ Marketplace initialized successfully!');

        return NextResponse.json({
            success: true,
            data: {
                auctionHouseAddress,
                message: 'Marketplace created successfully',
            },
        });
    } catch (error) {
        console.error('❌ Error initializing marketplace:', error);
        return NextResponse.json(
            {
                success: false,
                error: `Failed to initialize marketplace: ${(error as Error).message}`,
            },
            { status: 500 }
        );
    }
}

