import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { SolanaService } from '@/lib/solana/SolanaService'
import { BubblegumService, MerkleTreeSize } from '@/lib/solana/BubblegumService'

const prisma = new PrismaClient()

/**
 * POST /api/events/[id]/upgrade-cnft
 * 
 * Upgrade an existing event to use cNFT (create Merkle Tree)
 * This is for events created before cNFT support was added
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Get event
        const event = await prisma.event.findUnique({
            where: { id },
            include: {
                organizer: {
                    include: {
                        user: true,
                    },
                },
            },
        })

        if (!event) {
            return NextResponse.json(
                { success: false, error: 'Event not found' },
                { status: 404 }
            )
        }

        // Check if already has Merkle Tree
        if (event.merkleTreeAddress) {
            return NextResponse.json({
                success: true,
                message: 'Event already has cNFT infrastructure',
                merkleTreeAddress: event.merkleTreeAddress,
            })
        }

        console.log(`Upgrading event ${id} to cNFT...`)

        // Initialize services
        const solanaService = new SolanaService()
        const bubblegumService = new BubblegumService(solanaService)

        // Determine tree size based on tickets available
        let treeSize: MerkleTreeSize = 'SMALL'
        if (event.ticketsAvailable > 1000) {
            treeSize = 'MEDIUM'
        }
        if (event.ticketsAvailable > 10000) {
            treeSize = 'LARGE'
        }

        // Step 1: Create Collection NFT if not exists
        let collectionNftAddress = event.collectionNftAddress

        if (!collectionNftAddress) {
            console.log('Creating Collection NFT...')
            const collectionResult = await bubblegumService.createCollectionNFT({
                name: `${event.title} Tickets`,
                symbol: 'TICKET',
                uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/metadata/collection/${event.id}`,
                sellerFeeBasisPoints: 250,
            })
            collectionNftAddress = collectionResult.collectionAddress
            console.log('Collection NFT created:', collectionNftAddress)
        }

        // Step 2: Create Merkle Tree
        console.log(`Creating Merkle Tree (size: ${treeSize})...`)
        const treeResult = await bubblegumService.createMerkleTree(treeSize)
        console.log('Merkle Tree created:', treeResult.merkleTreeAddress)

        // Step 3: Update event in database
        const updatedEvent = await prisma.event.update({
            where: { id },
            data: {
                collectionNftAddress,
                merkleTreeAddress: treeResult.merkleTreeAddress,
                merkleTreeDepth: treeResult.depth,
                nftType: 'cnft',
            },
        })

        console.log('Event upgraded successfully!')

        return NextResponse.json({
            success: true,
            message: 'Event upgraded to cNFT successfully',
            collectionNftAddress,
            merkleTreeAddress: treeResult.merkleTreeAddress,
            merkleTreeDepth: treeResult.depth,
            capacity: treeResult.capacity,
        })

    } catch (error) {
        console.error('Error upgrading event:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to upgrade event',
            },
            { status: 500 }
        )
    }
}
