import { NextRequest, NextResponse } from 'next/server';
import { SolanaService } from '@/lib/solana/SolanaService';
import { CollectionService } from '@/lib/solana/CollectionService';
import { CandyMachineService } from '@/lib/solana/CandyMachineService';

// Lazy initialization to avoid instantiation during build time
function getServices() {
    const solanaService = new SolanaService();
    const collectionService = new CollectionService();
    const candyMachineService = new CandyMachineService(solanaService, collectionService);
    return { solanaService, collectionService, candyMachineService };
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ wallet: string }> }
) {
    try {
        const { wallet } = await params;
        const { searchParams } = new URL(request.url);
        const collectionId = searchParams.get('collectionId');
        const { solanaService, candyMachineService } = getServices();

        // Validate wallet address
        const isValidWallet = await solanaService.isWalletValid(wallet);
        if (!isValidWallet) {
            return NextResponse.json(
                { success: false, error: 'Invalid wallet address' },
                { status: 400 }
            );
        }

        // Get user's NFTs from blockchain
        const userTickets = await candyMachineService.getUserTickets(wallet, collectionId || undefined);

        return NextResponse.json({
            success: true,
            data: {
                wallet,
                tickets: userTickets,
                count: userTickets.length,
                platformWallet: solanaService.getWalletAddress(),
                filteredByPlatform: true,
            },
            message: `Found ${userTickets.length} ticket(s)`,
        });
    } catch (error) {
        console.error('Error getting user tickets:', error);
        return NextResponse.json(
            { success: false, error: `Failed to get user tickets: ${(error as Error).message}` },
            { status: 500 }
        );
    }
}

