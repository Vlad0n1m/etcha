import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

/**
 * GET /api/scanner/stats/[eventId] - Get scanning statistics for an event
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ eventId: string }> }
) {
    try {
        const { eventId } = await params

        // Check authorization
        const session = await auth()
        const { searchParams } = new URL(request.url)
        const scannerCode = searchParams.get("scannerCode")

        let isAuthorized = false

        if (session?.user) {
            if (session.user.role === "ADMIN") {
                isAuthorized = true
            } else if (session.user.role === "ORGANIZER") {
                const event = await prisma.event.findFirst({
                    where: {
                        id: eventId,
                        organizer: { userId: session.user.id },
                    },
                })
                isAuthorized = !!event
            }
        }

        // Check scanner code if not authorized via session
        if (!isAuthorized && scannerCode) {
            const code = await prisma.scannerCode.findFirst({
                where: {
                    code: scannerCode,
                    eventId,
                    isActive: true,
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } },
                    ],
                },
            })
            isAuthorized = !!code
        }

        if (!isAuthorized) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            )
        }

        // Get event details
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: {
                id: true,
                title: true,
                date: true,
                ticketsAvailable: true,
                ticketsSold: true,
            },
        })

        if (!event) {
            return NextResponse.json(
                { success: false, message: "Event not found" },
                { status: 404 }
            )
        }

        // Get attendance statistics
        const [totalScanned, recentScans, poapStats] = await Promise.all([
            // Total scanned tickets
            prisma.attendance.count({
                where: { eventId },
            }),
            // Recent scans (last 10)
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
            // POAP minting stats
            prisma.attendance.groupBy({
                by: ["poapStatus"],
                where: { eventId },
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

        // Calculate remaining tickets to scan
        const remainingToScan = event.ticketsSold - totalScanned

        return NextResponse.json({
            success: true,
            event: {
                id: event.id,
                title: event.title,
                date: event.date,
            },
            stats: {
                ticketsSold: event.ticketsSold,
                ticketsAvailable: event.ticketsAvailable,
                totalScanned,
                remainingToScan: Math.max(0, remainingToScan),
                scanPercentage: event.ticketsSold > 0
                    ? Math.round((totalScanned / event.ticketsSold) * 100)
                    : 0,
                poap: poapCounts,
            },
            recentScans: recentScans.map((scan) => ({
                id: scan.id,
                scannedAt: scan.scannedAt,
                ticketNumber: scan.ticket.tokenId,
                attendeeName: scan.user.name || "Anonymous",
                poapStatus: scan.poapStatus,
            })),
        })
    } catch (error) {
        console.error("Error fetching scanner stats:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
