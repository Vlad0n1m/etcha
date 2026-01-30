import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Get current user session (optional)
        const session = await auth()

        // Fetch event with related data including ticket types
        const event = await prisma.event.findUnique({
            where: { id },
            include: {
                category: true,
                organizer: {
                    include: {
                        user: true,
                    },
                },
                ticketTypes: {
                    orderBy: { sortOrder: 'asc' },
                },
            },
        })

        if (!event) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Event not found",
                },
                { status: 404 }
            )
        }

        if (!event.organizer) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Event organizer not found",
                },
                { status: 404 }
            )
        }

        // Get user's ticket count for this event (if logged in)
        let userTicketCount = 0
        if (session?.user?.id) {
            userTicketCount = await prisma.ticket.count({
                where: {
                    eventId: id,
                    userId: session.user.id,
                },
            })
        }

        // Format ticket types for response
        const formattedTicketTypes = event.ticketTypes.map(tt => ({
            id: tt.id,
            name: tt.name,
            price: tt.price,
            quantity: tt.quantity,
            sold: tt.sold,
            available: tt.quantity - tt.sold,
            description: tt.description,
            sortOrder: tt.sortOrder,
        }))

        // Format response to match frontend EventData interface
        const formattedEvent = {
            id: event.id,
            title: event.title,
            company: event.organizer.companyName,
            price: event.price, // Base price for backward compatibility
            date: event.date.toISOString().split("T")[0], // Format as YYYY-MM-DD
            time: event.time,
            ticketsAvailable: event.ticketsAvailable - event.ticketsSold,
            totalTicketsAvailable: event.ticketsAvailable,
            ticketsSold: event.ticketsSold,
            imageUrl: event.imageUrl,
            category: event.category.name,
            description: event.description,
            fullAddress: event.fullAddress,
            locationMapUrl: event.locationMapUrl,
            maxTicketsPerUser: event.maxTicketsPerUser,
            organizer: {
                id: event.organizer.userId, // User ID for follow functionality
                name: event.organizer.companyName,
                avatar: event.organizer.avatar || "/logo.png",
                description: event.organizer.description || "Event organizer",
            },
            ticketTypes: formattedTicketTypes,
            schedule: [], // Schedule disabled for MVP
            candyMachineAddress: event.candyMachineAddress,
            collectionNftAddress: event.collectionNftAddress,
            // cNFT fields
            merkleTreeAddress: event.merkleTreeAddress,
            merkleTreeDepth: event.merkleTreeDepth,
            nftType: event.nftType || 'legacy',
        }

        return NextResponse.json({
            success: true,
            event: formattedEvent,
            userTicketCount, // How many tickets the current user already owns
        })
    } catch (error) {
        console.error("Error fetching event:", error)
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to fetch event",
            },
            { status: 500 }
        )
    }
}
