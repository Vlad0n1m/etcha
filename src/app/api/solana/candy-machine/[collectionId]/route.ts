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

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ collectionId: string }> }
) {
    try {
        const { collectionId } = await params;
        const { collectionService, candyMachineService } = getServices();
        const collection = await collectionService.getCollectionById(collectionId);

        if (!collection) {
            return NextResponse.json(
                { success: false, error: 'Collection not found' },
                { status: 404 }
            );
        }

        if (collection.candyMachineAddress) {
            return NextResponse.json(
                { success: false, error: 'Candy Machine already exists for this collection' },
                { status: 400 }
            );
        }

        const candyMachineAddress = await candyMachineService.createCandyMachine(collection);

        // Update collection with Candy Machine address
        await collectionService.updateCollection(collectionId, {
            candyMachineAddress,
        });

        return NextResponse.json({
            success: true,
            data: {
                candyMachineAddress,
            },
            message: 'Candy Machine created successfully',
        });
    } catch (error) {
        console.error('Error creating Candy Machine:', error);
        return NextResponse.json(
            { success: false, error: `Failed to create Candy Machine: ${(error as Error).message}` },
            { status: 500 }
        );
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ collectionId: string }> }
) {
    try {
        const { collectionId } = await params;
        const { collectionService, candyMachineService } = getServices();
        const collection = await collectionService.getCollectionById(collectionId);

        if (!collection || !collection.candyMachineAddress) {
            return NextResponse.json(
                { success: false, error: 'Candy Machine not found' },
                { status: 404 }
            );
        }

        const info = await candyMachineService.getCandyMachineInfo(collection.candyMachineAddress);

        return NextResponse.json({
            success: true,
            data: info,
        });
    } catch (error) {
        console.error('Error getting Candy Machine info:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get Candy Machine info' },
            { status: 500 }
        );
    }
}

