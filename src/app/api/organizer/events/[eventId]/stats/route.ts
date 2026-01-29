import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

/**
 * GET /api/organizer/events/[eventId]/stats
 * 
 * Get detailed statistics for an event including ticket type breakdown
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

        // Get event with organizer info and ticket types
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
                maxTicketsPerUser: true,
                organizer: {
                    select: { userId: true },
                },
                ticketTypes: {
                    orderBy: { sortOrder: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        quantity: true,
                        sold: true,
                    },
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

        // Get attendance stats with ticket type info
        const [attendanceCount, poapStats, recentScans, ticketTypeSalesStats] = await Promise.all([
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
            // Recent scans with ticket type
            prisma.attendance.findMany({
                where: { eventId },
                orderBy: { scannedAt: "desc" },
                take: 10,
                include: {
                    ticket: {
                        select: {
                            tokenId: true,
                            ticketType: {
                                select: {
                                    name: true,
                                    price: true,
                                },
                            },
                        },
                    },
                    user: {
                        select: { name: true },
                    },
                },
            }),
            // Group scanned tickets by type to calculate actual revenue
            prisma.ticket.groupBy({
                by: ["ticketTypeId"],
                where: {
                    eventId,
                    isUsed: true, // Only count scanned tickets for revenue
                },
                _count: { _all: true },
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

        // Calculate revenue based on ticket types
        let totalRevenue = 0
        let scannedRevenue = 0
        const ticketTypesWithStats = event.ticketTypes.map(tt => {
            const typeRevenue = tt.sold * tt.price
            totalRevenue += typeRevenue

            // Find scanned count for this type
            const scannedStat = ticketTypeSalesStats.find(s => s.ticketTypeId === tt.id)
            const scannedCount = scannedStat?._count._all || 0
            const scannedTypeRevenue = scannedCount * tt.price
            scannedRevenue += scannedTypeRevenue

            return {
                id: tt.id,
                name: tt.name,
                price: tt.price,
                quantity: tt.quantity,
                sold: tt.sold,
                available: tt.quantity - tt.sold,
                revenue: typeRevenue,
                scannedCount,
                scannedRevenue: scannedTypeRevenue,
            }
        })

        // If no ticket types (legacy event), calculate from event price
        if (event.ticketTypes.length === 0) {
            totalRevenue = event.ticketsSold * event.price
            scannedRevenue = attendanceCount * event.price
        }

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
                maxTicketsPerUser: event.maxTicketsPerUser,
            },
            tickets: {
                available: event.ticketsAvailable,
                sold: event.ticketsSold,
                remaining: event.ticketsAvailable - event.ticketsSold,
                soldPercentage,
            },
            ticketTypes: ticketTypesWithStats,
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
                // Revenue from actually scanned (used) tickets
                scannedTotal: scannedRevenue,
                scannedOrganizerShare: scannedRevenue * 0.975,
                scannedPlatformFee: scannedRevenue * 0.025,
            },
            recentScans: recentScans.map((scan) => ({
                id: scan.id,
                scannedAt: scan.scannedAt.toISOString(),
                ticketNumber: scan.ticket.tokenId,
                ticketType: scan.ticket.ticketType?.name || "Standard",
                ticketPrice: scan.ticket.ticketType?.price || event.price,
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
