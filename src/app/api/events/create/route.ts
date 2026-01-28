import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/generated/prisma"
import { SolanaService } from "@/lib/solana/SolanaService"
import { BubblegumService, MerkleTreeSize } from "@/lib/solana/BubblegumService"

const prisma = new PrismaClient()

/**
 * POST /api/events/create
 * 
 * Create a new event with cNFT infrastructure
 * - Creates Collection NFT
 * - Creates Merkle Tree for ticket minting
 * - Saves event to database
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            title,
            description,
            date,
            time,
            fullAddress,
            categoryId,
            imageUrl,
            ticketsAvailable,
            price,
            organizerWallet,
            collectionMetadata,
        } = body

        // Validate required fields
        if (
            !title ||
            !description ||
            !date ||
            !time ||
            !fullAddress ||
            !categoryId ||
            !ticketsAvailable ||
            !price ||
            !organizerWallet
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Missing required fields",
                },
                { status: 400 }
            )
        }

        // Validate title length (max 10 characters for NFT metadata)
        if (title.length > 10) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Event title must be 10 characters or less",
                },
                { status: 400 }
            )
        }

        console.log(`Creating cNFT event: ${title} with ${ticketsAvailable} tickets`)

        // Step 1: Find or create organizer
        let user = await prisma.user.findUnique({
            where: { walletAddress: organizerWallet },
            include: { organizer: true },
        })

        let organizer = user?.organizer

        if (!organizer) {
            if (!user) {
                user = await prisma.user.create({
                    data: {
                        walletAddress: organizerWallet,
                        internalWalletAddress: `temp_${organizerWallet}_${Date.now()}`,
                    },
                    include: { organizer: true },
                })
            }

            if (!user) {
                throw new Error("Failed to create or find user")
            }

            organizer = await prisma.organizer.create({
                data: {
                    userId: user.id,
                    companyName: "Event Organizer",
                    description: "Professional event organizer",
                },
            })
        }

        // Step 2: Create event in database (without blockchain addresses yet)
        const event = await prisma.event.create({
            data: {
                title,
                description,
                date: new Date(date),
                time,
                fullAddress,
                imageUrl: imageUrl || "/logo.png",
                ticketsAvailable,
                ticketsSold: 0,
                price,
                schedule: "",
                categoryId,
                organizerId: organizer.id,
                isActive: true,
                nftType: 'cnft',
            },
        })

        console.log(`Event created in DB: ${event.id}`)

        // Step 3: Create cNFT infrastructure
        try {
            const solanaService = new SolanaService()
            const bubblegumService = new BubblegumService(solanaService)

            // Determine tree size based on tickets
            let treeSize: MerkleTreeSize = 'SMALL' // Up to 16,384 tickets
            if (ticketsAvailable > 1000) {
                treeSize = 'MEDIUM' // Up to 131,072 tickets
            }
            if (ticketsAvailable > 10000) {
                treeSize = 'LARGE' // Up to 1,048,576 tickets
            }

            console.log(`Creating cNFT collection with tree size: ${treeSize}`)

            // Create Collection NFT
            const collectionName = collectionMetadata?.name || title
            const collectionResult = await bubblegumService.createCollectionNFT({
                name: `${collectionName} Tickets`,
                symbol: collectionMetadata?.symbol || 'TICKET',
                uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/metadata/collection/${event.id}`,
                sellerFeeBasisPoints: 250,
            })

            console.log(`Collection NFT created: ${collectionResult.collectionAddress}`)

            // Create Merkle Tree
            const treeResult = await bubblegumService.createMerkleTree(treeSize)

            console.log(`Merkle Tree created: ${treeResult.merkleTreeAddress}`)

            // Update event with blockchain addresses
            await prisma.event.update({
                where: { id: event.id },
                data: {
                    collectionNftAddress: collectionResult.collectionAddress,
                    merkleTreeAddress: treeResult.merkleTreeAddress,
                    merkleTreeDepth: treeResult.depth,
                    nftType: 'cnft',
                },
            })

            console.log(`Event updated with cNFT infrastructure`)

            return NextResponse.json({
                success: true,
                message: "Event created with cNFT collection",
                eventId: event.id,
                collectionAddress: collectionResult.collectionAddress,
                merkleTreeAddress: treeResult.merkleTreeAddress,
                treeCapacity: treeResult.capacity,
            })

        } catch (blockchainError) {
            console.error("Error creating cNFT infrastructure:", blockchainError)

            // Event was created but blockchain setup failed
            // Leave event in DB - can be upgraded later
            return NextResponse.json({
                success: true,
                message: "Event created but cNFT setup failed. You can upgrade it later.",
                eventId: event.id,
                warning: blockchainError instanceof Error ? blockchainError.message : "Blockchain error",
            })
        }

    } catch (error) {
        console.error("Error creating event:", error)
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to create event",
            },
            { status: 500 }
        )
    }
}
