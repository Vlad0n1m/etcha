import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { SolanaService } from '@/lib/solana/SolanaService';
import { CollectionService } from '@/lib/solana/CollectionService';
import { CandyMachineService } from '@/lib/solana/CandyMachineService';
import { MerkleTreeSize, MERKLE_TREE_CONFIGS } from '@/lib/solana/BubblegumService';

const createTreeSchema = z.object({
    eventId: z.string(),
    treeSize: z.enum(['SMALL', 'MEDIUM', 'LARGE']).optional(),
});

/**
 * POST /api/solana/merkle-tree
 * Create a new Merkle tree for cNFT minting
 * 
 * This should be called when setting up an event for cNFT-based tickets.
 * The tree creation is a one-time operation and costs ~0.1-1.5 SOL depending on size.
 * 
 * Tree sizes:
 * - SMALL: 16,384 tickets (~0.1 SOL)
 * - MEDIUM: 131,072 tickets (~0.5 SOL)
 * - LARGE: 1,048,576 tickets (~1.5 SOL)
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { eventId, treeSize = 'SMALL' } = createTreeSchema.parse(body);

        // Get event from database
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                organizer: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        if (!event) {
            return NextResponse.json(
                { success: false, error: 'Event not found' },
                { status: 404 }
            );
        }

        // Check if tree already exists
        if (event.merkleTreeAddress) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Merkle tree already exists for this event',
                    merkleTreeAddress: event.merkleTreeAddress,
                },
                { status: 400 }
            );
        }

        // Validate organizer
        const organizerWallet = event.organizer?.user?.walletAddress;
        if (!organizerWallet) {
            return NextResponse.json(
                { success: false, error: 'Event organizer wallet not found' },
                { status: 400 }
            );
        }

        console.log(`Creating Merkle tree for event ${eventId} with size ${treeSize}`);

        // Initialize services
        const solanaService = new SolanaService();
        const collectionService = new CollectionService();
        const candyMachineService = new CandyMachineService(solanaService, collectionService);
        const bubblegumService = candyMachineService.getBubblegumService();

        // Check platform balance
        const balance = await solanaService.getBalance();
        const config = MERKLE_TREE_CONFIGS[treeSize as MerkleTreeSize];
        const estimatedCost = treeSize === 'SMALL' ? 0.15 : treeSize === 'MEDIUM' ? 0.6 : 2.0;

        if (balance < estimatedCost) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Insufficient platform balance. Required: ~${estimatedCost} SOL, Available: ${balance.toFixed(4)} SOL`,
                },
                { status: 400 }
            );
        }

        // Create Collection NFT if not exists
        let collectionNftAddress = event.collectionNftAddress;
        if (!collectionNftAddress) {
            console.log('Creating collection NFT...');
            const collectionResult = await bubblegumService.createCollectionNFT({
                name: event.title,
                symbol: event.title.substring(0, 4).toUpperCase(),
                uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/metadata/${eventId}`,
                sellerFeeBasisPoints: 250,
            });
            collectionNftAddress = collectionResult.collectionAddress;
        }

        // Create Merkle tree
        console.log(`Creating Merkle tree (${treeSize})...`);
        const treeResult = await bubblegumService.createMerkleTree(treeSize as MerkleTreeSize);

        // Update event in database
        await prisma.event.update({
            where: { id: eventId },
            data: {
                collectionNftAddress,
                merkleTreeAddress: treeResult.merkleTreeAddress,
                merkleTreeDepth: treeResult.maxDepth,
                nftType: 'cnft',
            },
        });

        console.log('✅ Merkle tree created successfully!');
        console.log('   Tree Address:', treeResult.merkleTreeAddress);
        console.log('   Capacity:', treeResult.capacity, 'tickets');

        return NextResponse.json({
            success: true,
            data: {
                eventId,
                merkleTreeAddress: treeResult.merkleTreeAddress,
                collectionNftAddress,
                maxDepth: treeResult.maxDepth,
                maxBufferSize: treeResult.maxBufferSize,
                capacity: treeResult.capacity,
                signature: treeResult.signature,
                nftType: 'cnft',
            },
            message: `Merkle tree created with capacity for ${treeResult.capacity.toLocaleString()} tickets`,
        });
    } catch (error) {
        console.error('❌ Error creating Merkle tree:', error);
        return NextResponse.json(
            {
                success: false,
                error: `Failed to create Merkle tree: ${(error as Error).message}`,
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/solana/merkle-tree?eventId=xxx
 * Get Merkle tree information for an event
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json(
                { success: false, error: 'eventId query parameter is required' },
                { status: 400 }
            );
        }

        // Get event from database
        const event = await prisma.event.findUnique({
            where: { id: eventId },
        });

        if (!event) {
            return NextResponse.json(
                { success: false, error: 'Event not found' },
                { status: 404 }
            );
        }

        // Check if event has Merkle tree
        if (!event.merkleTreeAddress) {
            return NextResponse.json({
                success: true,
                data: {
                    eventId,
                    nftType: event.nftType || 'legacy',
                    hasMerkleTree: false,
                    message: 'This event does not have a Merkle tree configured',
                },
            });
        }

        // Get tree stats from blockchain
        const solanaService = new SolanaService();
        const collectionService = new CollectionService();
        const candyMachineService = new CandyMachineService(solanaService, collectionService);
        const bubblegumService = candyMachineService.getBubblegumService();

        let treeStats;
        try {
            treeStats = await bubblegumService.getTreeStats(event.merkleTreeAddress);
        } catch (error) {
            console.warn('Could not fetch tree stats from blockchain:', error);
            treeStats = null;
        }

        return NextResponse.json({
            success: true,
            data: {
                eventId,
                nftType: event.nftType,
                hasMerkleTree: true,
                merkleTreeAddress: event.merkleTreeAddress,
                collectionNftAddress: event.collectionNftAddress,
                merkleTreeDepth: event.merkleTreeDepth,
                // Stats from blockchain (if available)
                treeStats: treeStats || {
                    totalCapacity: event.merkleTreeDepth ? Math.pow(2, event.merkleTreeDepth) : null,
                    minted: event.ticketsSold,
                    remaining: null,
                    percentUsed: null,
                },
                // Stats from database
                ticketsSold: event.ticketsSold,
                ticketsAvailable: event.ticketsAvailable,
            },
        });
    } catch (error) {
        console.error('❌ Error getting Merkle tree info:', error);
        return NextResponse.json(
            {
                success: false,
                error: `Failed to get Merkle tree info: ${(error as Error).message}`,
            },
            { status: 500 }
        );
    }
}
