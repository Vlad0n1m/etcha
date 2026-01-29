import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/generated/prisma"
import { getPlatformTreeService } from "@/lib/solana/PlatformTreeService"

const prisma = new PrismaClient()

/**
 * POST /api/events/create
 * 
 * Create a new event with cNFT infrastructure
 * - Uses shared platform Merkle Tree for tickets (cost-efficient)
 * - Uses shared platform Merkle Tree for POAP badges
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

        // Step 3: Verify platform tree is ready
        try {
            // Use shared platform Merkle Tree instead of creating per-event tree
            // This saves ~0.2 SOL per event!
            console.log(`Using shared platform Merkle Tree for tickets`)

            const platformTreeService = getPlatformTreeService()

            // Get or create platform ticket tree
            const ticketTree = await platformTreeService.getActiveTree('ticket')
            console.log(`Platform ticket tree: ${ticketTree.address}`)
            console.log(`Available capacity: ${ticketTree.available}`)

            if (!ticketTree.collectionAddress) {
                throw new Error('Platform ticket collection not initialized')
            }

            // Update event to use platform tree
            await prisma.event.update({
                where: { id: event.id },
                data: {
                    nftType: 'cnft',
                    // Note: merkleTreeAddress and collectionNftAddress are now optional
                    // Tickets are minted using the platform shared tree
                },
            })

            console.log(`Event updated to use shared platform tree`)

            return NextResponse.json({
                success: true,
                message: "Event created with shared platform tree",
                eventId: event.id,
                platformTree: {
                    address: ticketTree.address,
                    collectionAddress: ticketTree.collectionAddress,
                    available: ticketTree.available,
                },
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
