import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

/**
 * GET /api/organizer/events
 * 
 * Get all events for the logged-in organizer
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            )
        }

        // Only organizers and admins can access
        if (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN") {
            return NextResponse.json(
                { success: false, message: "Access denied" },
                { status: 403 }
            )
        }

        // Get organizer profile for the user
        const organizer = await prisma.organizer.findUnique({
            where: { userId: session.user.id },
        })

        // Admin can see all events, organizer only their own
        const whereClause = session.user.role === "ADMIN"
            ? {}
            : organizer
                ? { organizerId: organizer.id }
                : { organizerId: "none" } // No events if no organizer profile

        // Fetch events with attendance counts
        const events = await prisma.event.findMany({
            where: whereClause,
            orderBy: { date: "desc" },
            select: {
                id: true,
                title: true,
                date: true,
                time: true,
                fullAddress: true,
                imageUrl: true,
                ticketsAvailable: true,
                ticketsSold: true,
                price: true,
                isActive: true,
                poapMerkleTreeAddress: true,
                poapCollectionAddress: true,
                _count: {
                    select: {
                        attendances: true,
                    },
                },
            },
        })

        // Format response
        const formattedEvents = events.map((event) => ({
            id: event.id,
            title: event.title,
            date: event.date.toISOString(),
            time: event.time,
            fullAddress: event.fullAddress,
            imageUrl: event.imageUrl,
            ticketsAvailable: event.ticketsAvailable,
            ticketsSold: event.ticketsSold,
            price: event.price,
            isActive: event.isActive,
            attendanceCount: event._count.attendances,
            hasPOAP: !!(event.poapMerkleTreeAddress && event.poapCollectionAddress),
        }))

        return NextResponse.json({
            success: true,
            events: formattedEvents,
        })
    } catch (error) {
        console.error("Error fetching organizer events:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
