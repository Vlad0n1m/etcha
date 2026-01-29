import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getPOAPService } from "@/lib/solana/POAPService"

/**
 * PUT /api/organizer/events/[eventId]/poap
 * 
 * Retry minting POAP for pending/failed attendances
 * Now uses shared platform tree - no per-event setup needed
 */
export async function PUT(
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

        if (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN") {
            return NextResponse.json(
                { success: false, message: "Access denied" },
                { status: 403 }
            )
        }

        // Get event with POAP details
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
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

        // Check access
        if (
            session.user.role !== "ADMIN" &&
            event.organizer?.userId !== session.user.id
        ) {
            return NextResponse.json(
                { success: false, message: "Access denied" },
                { status: 403 }
            )
        }

        // Get all pending/failed attendances
        const attendances = await prisma.attendance.findMany({
            where: {
                eventId,
                poapStatus: { in: ["pending", "failed"] },
            },
            select: {
                id: true,
                poapStatus: true,
            },
        })

        if (attendances.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No pending or failed POAP mints to retry",
                retried: 0,
            })
        }

        // Reset status to pending and trigger minting
        const poapService = getPOAPService()
        let retriedCount = 0

        for (const attendance of attendances) {
            // Reset status to pending
            await prisma.attendance.update({
                where: { id: attendance.id },
                data: { poapStatus: "pending" },
            })

            // Trigger async minting
            poapService.mintPOAPAsync(attendance.id).catch((error) => {
                console.error(`Error retrying POAP mint for ${attendance.id}:`, error)
            })

            retriedCount++
        }

        return NextResponse.json({
            success: true,
            message: `Retrying POAP minting for ${retriedCount} attendances`,
            retried: retriedCount,
        })
    } catch (error) {
        console.error("Error retrying POAP mints:", error)
        return NextResponse.json(
            { success: false, message: "Failed to retry POAP mints" },
            { status: 500 }
        )
    }
}
