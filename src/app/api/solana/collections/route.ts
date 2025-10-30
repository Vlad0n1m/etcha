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

export async function GET(request: NextRequest) {
    try {
        const { collectionService } = getServices();
        const collections = await collectionService.getCollections();

        return NextResponse.json({
            success: true,
            data: collections,
        });
    } catch (error) {
        console.error('Error getting collections:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get collections' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { eventId } = body;

        if (!eventId) {
            return NextResponse.json(
                { success: false, error: 'Event ID is required' },
                { status: 400 }
            );
        }

        const { collectionService, candyMachineService } = getServices();

        // Get event from database
        const { prisma } = await import('@/lib/db');
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: { organizer: true },
        });

        if (!event) {
            return NextResponse.json(
                { success: false, error: 'Event not found' },
                { status: 404 }
            );
        }

        // Create collection NFT
        const collection = await collectionService.createCollection(
            event,
            event.organizer?.userId || undefined,
            event.organizer?.companyName || undefined
        );

        // Create Collection NFT on blockchain
        const collectionNftAddress = await candyMachineService.createCollectionNFT(collection);

        // Update event with NFT address
        await prisma.event.update({
            where: { id: eventId },
            data: { collectionNftAddress },
        });

        return NextResponse.json({
            success: true,
            data: {
                ...collection,
                collectionNftAddress,
            },
            message: 'Collection NFT created successfully',
        });
    } catch (error) {
        console.error('Error creating collection:', error);
        return NextResponse.json(
            { success: false, error: `Failed to create collection: ${(error as Error).message}` },
            { status: 500 }
        );
    }
}

