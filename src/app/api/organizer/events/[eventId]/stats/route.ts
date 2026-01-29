import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

/**
 * GET /api/organizer/events/[eventId]/stats
 * 
 * Get detailed statistics for an event
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ eventId: string }> }
) {
    try {
        const { eventId } = await params
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

        // Get event with organizer info
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: {
                id: true,
                title: true,
                date: true,
                time: true,
                price: true,
                imageUrl: true,
                ticketsAvailable: true,
                ticketsSold: true,
                organizer: {
                    select: { userId: true },
                },
            },
        })

        if (!event) {
            return NextResponse.json(
                { success: false, message: "Event not found" },
                { status: 404 }
            )
        }

        // Check if user has access to this event
        if (
            session.user.role !== "ADMIN" &&
            event.organizer?.userId !== session.user.id
        ) {
            return NextResponse.json(
                { success: false, message: "Access denied" },
                { status: 403 }
            )
        }

        // Get attendance stats
        const [attendanceCount, poapStats, recentScans] = await Promise.all([
            // Total attendance
            prisma.attendance.count({
                where: { eventId },
            }),
            // POAP stats by status
            prisma.attendance.groupBy({
                by: ["poapStatus"],
                where: { eventId },
                _count: { _all: true },
            }),
            // Recent scans
            prisma.attendance.findMany({
                where: { eventId },
                orderBy: { scannedAt: "desc" },
                take: 10,
                include: {
                    ticket: {
                        select: { tokenId: true },
                    },
                    user: {
                        select: { name: true },
                    },
                },
            }),
        ])

        // Process POAP stats
        const poapCounts = poapStats.reduce(
            (acc, item) => {
                acc[item.poapStatus] = item._count._all
                return acc
            },
            { pending: 0, minted: 0, failed: 0 } as Record<string, number>
        )

        // Calculate revenue
        const totalRevenue = event.ticketsSold * event.price
        const platformFee = totalRevenue * 0.025
        const organizerShare = totalRevenue - platformFee

        // Calculate percentages
        const soldPercentage = event.ticketsAvailable > 0
            ? Math.round((event.ticketsSold / event.ticketsAvailable) * 100)
            : 0
        const attendancePercentage = event.ticketsSold > 0
            ? Math.round((attendanceCount / event.ticketsSold) * 100)
            : 0

        return NextResponse.json({
            success: true,
            event: {
                id: event.id,
                title: event.title,
                date: event.date.toISOString(),
                time: event.time,
                price: event.price,
                imageUrl: event.imageUrl,
            },
            tickets: {
                available: event.ticketsAvailable,
                sold: event.ticketsSold,
                remaining: event.ticketsAvailable - event.ticketsSold,
                soldPercentage,
            },
            attendance: {
                total: attendanceCount,
                percentage: attendancePercentage,
            },
            poap: {
                minted: poapCounts.minted || 0,
                pending: poapCounts.pending || 0,
                failed: poapCounts.failed || 0,
            },
            revenue: {
                total: totalRevenue,
                organizerShare,
                platformFee,
            },
            recentScans: recentScans.map((scan) => ({
                id: scan.id,
                scannedAt: scan.scannedAt.toISOString(),
                ticketNumber: scan.ticket.tokenId,
                attendeeName: scan.user.name || "Anonymous",
                poapStatus: scan.poapStatus,
            })),
        })
    } catch (error) {
        console.error("Error fetching event stats:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
