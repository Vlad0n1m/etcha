import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/generated/prisma"
import { getPlatformTreeService } from "@/lib/solana/PlatformTreeService"

const prisma = new PrismaClient()

interface TicketTypeInput {
    name: string
    price: number
    quantity: number
    description?: string | null
    sortOrder: number
}

/**
 * POST /api/events/create
 * 
 * Create a new event with cNFT infrastructure
 * - Uses shared platform Merkle Tree for tickets (cost-efficient)
 * - Uses shared platform Merkle Tree for POAP badges
 * - Saves event to database with multiple ticket types
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
            locationMapUrl,
            categoryId,
            imageUrl,
            ticketTypes,
            maxTicketsPerUser,
            organizerWallet,
            // Legacy support: if ticketTypes not provided, use single ticket configuration
            ticketsAvailable: legacyTicketsAvailable,
            price: legacyPrice,
        } = body

        // Validate required fields
        if (
            !title ||
            !description ||
            !date ||
            !time ||
            !fullAddress ||
            !categoryId ||
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

        // Handle ticket types (support both new format and legacy)
        let processedTicketTypes: TicketTypeInput[]

        if (ticketTypes && Array.isArray(ticketTypes) && ticketTypes.length > 0) {
            // New format with multiple ticket types
            processedTicketTypes = ticketTypes.map((tt: TicketTypeInput, index: number) => ({
                name: tt.name,
                price: tt.price,
                quantity: tt.quantity,
                description: tt.description || null,
                sortOrder: tt.sortOrder ?? index,
            }))

            // Validate each ticket type
            for (const tt of processedTicketTypes) {
                if (!tt.name || tt.name.trim().length === 0) {
                    return NextResponse.json(
                        { success: false, message: "All ticket types must have a name" },
                        { status: 400 }
                    )
                }
                if (tt.price <= 0) {
                    return NextResponse.json(
                        { success: false, message: `Ticket type "${tt.name}" must have a price greater than 0` },
                        { status: 400 }
                    )
                }
                if (tt.quantity <= 0) {
                    return NextResponse.json(
                        { success: false, message: `Ticket type "${tt.name}" must have a quantity greater than 0` },
                        { status: 400 }
                    )
                }
            }
        } else if (legacyTicketsAvailable && legacyPrice) {
            // Legacy format with single ticket type
            processedTicketTypes = [{
                name: "Standard",
                price: legacyPrice,
                quantity: legacyTicketsAvailable,
                description: null,
                sortOrder: 0,
            }]
        } else {
            return NextResponse.json(
                { success: false, message: "Ticket types or legacy ticket configuration required" },
                { status: 400 }
            )
        }

        // Calculate total tickets available
        const totalTicketsAvailable = processedTicketTypes.reduce((sum, tt) => sum + tt.quantity, 0)

        // Use the lowest price as the base price (for backward compatibility)
        const basePrice = Math.min(...processedTicketTypes.map(tt => tt.price))

        console.log(`Creating cNFT event: ${title} with ${totalTicketsAvailable} tickets (${processedTicketTypes.length} types)`)

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

        // Step 2: Create event with ticket types in a transaction
        const event = await prisma.$transaction(async (tx) => {
            // Create the event
            const newEvent = await tx.event.create({
                data: {
                    title,
                    description,
                    date: new Date(date),
                    time,
                    fullAddress,
                    locationMapUrl: locationMapUrl || null,
                    imageUrl: imageUrl || "/logo.png",
                    ticketsAvailable: totalTicketsAvailable,
                    ticketsSold: 0,
                    price: basePrice, // Legacy field for backward compatibility
                    maxTicketsPerUser: maxTicketsPerUser || null,
                    schedule: "",
                    categoryId,
                    organizerId: organizer.id,
                    isActive: true,
                    nftType: 'cnft',
                },
            })

            // Create ticket types
            for (const tt of processedTicketTypes) {
                await tx.ticketType.create({
                    data: {
                        eventId: newEvent.id,
                        name: tt.name,
                        price: tt.price,
                        quantity: tt.quantity,
                        sold: 0,
                        description: tt.description,
                        sortOrder: tt.sortOrder,
                    },
                })
            }

            return newEvent
        })

        console.log(`Event created in DB: ${event.id} with ${processedTicketTypes.length} ticket types`)

        // Step 3: Verify platform tree is ready (auto-initialize if needed)
        try {
            // Use shared platform Merkle Tree instead of creating per-event tree
            // This saves ~0.2 SOL per event!
            console.log(`Using shared platform Merkle Tree for tickets`)

            const platformTreeService = getPlatformTreeService()

            // Auto-initialize platform trees if not done yet
            // This will create MEDIUM trees (~0.5 SOL each) on first event creation
            await platformTreeService.initializeIfNeeded()

            // Get platform ticket tree
            const ticketTree = await platformTreeService.getActiveTree('ticket')
            console.log(`Platform ticket tree: ${ticketTree.address}`)
            console.log(`Available capacity: ${ticketTree.available}`)

            if (!ticketTree.collectionAddress) {
                throw new Error('Platform ticket collection not initialized')
            }

            console.log(`Event ready to use shared platform tree`)

            return NextResponse.json({
                success: true,
                message: "Event created with shared platform tree",
                eventId: event.id,
                ticketTypes: processedTicketTypes.length,
                totalTickets: totalTicketsAvailable,
                platformTree: {
                    address: ticketTree.address,
                    collectionAddress: ticketTree.collectionAddress,
                    available: ticketTree.available,
                },
            })

        } catch (blockchainError) {
            console.error("Error verifying platform tree:", blockchainError)

            // Event was created but platform tree check failed
            // This likely means insufficient SOL for tree initialization
            return NextResponse.json({
                success: true,
                message: "Event created. Platform trees need to be initialized by admin.",
                eventId: event.id,
                ticketTypes: processedTicketTypes.length,
                totalTickets: totalTicketsAvailable,
                warning: blockchainError instanceof Error ? blockchainError.message : "Platform tree not ready",
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
