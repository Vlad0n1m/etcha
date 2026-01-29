import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { randomBytes } from "crypto"

/**
 * Generate a unique scanner code
 */
function generateScannerCode(): string {
    // Generate a 6-character alphanumeric code (uppercase)
    return randomBytes(4).toString("hex").toUpperCase().slice(0, 6)
}

/**
 * GET /api/scanner/codes - List scanner codes for an event
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

        const { searchParams } = new URL(request.url)
        const eventId = searchParams.get("eventId")

        if (!eventId) {
            return NextResponse.json(
                { success: false, message: "Event ID is required" },
                { status: 400 }
            )
        }

        // Verify user has access to this event
        let hasAccess = false
        if (session.user.role === "ADMIN") {
            hasAccess = true
        } else if (session.user.role === "ORGANIZER") {
            const event = await prisma.event.findFirst({
                where: {
                    id: eventId,
                    organizer: { userId: session.user.id },
                },
            })
            hasAccess = !!event
        }

        if (!hasAccess) {
            return NextResponse.json(
                { success: false, message: "Access denied" },
                { status: 403 }
            )
        }

        const codes = await prisma.scannerCode.findMany({
            where: { eventId },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json({
            success: true,
            codes,
        })
    } catch (error) {
        console.error("Error fetching scanner codes:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * POST /api/scanner/codes - Create a new scanner code for an event
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { eventId, name, expiresAt } = body

        if (!eventId || !name) {
            return NextResponse.json(
                { success: false, message: "Event ID and name are required" },
                { status: 400 }
            )
        }

        // Verify user has access to this event
        let hasAccess = false
        if (session.user.role === "ADMIN") {
            hasAccess = true
        } else if (session.user.role === "ORGANIZER") {
            const event = await prisma.event.findFirst({
                where: {
                    id: eventId,
                    organizer: { userId: session.user.id },
                },
            })
            hasAccess = !!event
        }

        if (!hasAccess) {
            return NextResponse.json(
                { success: false, message: "Access denied" },
                { status: 403 }
            )
        }

        // Generate unique code
        let code = generateScannerCode()
        let attempts = 0
        while (attempts < 10) {
            const existing = await prisma.scannerCode.findUnique({
                where: { code },
            })
            if (!existing) break
            code = generateScannerCode()
            attempts++
        }

        const scannerCode = await prisma.scannerCode.create({
            data: {
                eventId,
                code,
                name,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
        })

        return NextResponse.json({
            success: true,
            code: scannerCode,
        })
    } catch (error) {
        console.error("Error creating scanner code:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/scanner/codes - Deactivate a scanner code
 */
export async function DELETE(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const codeId = searchParams.get("id")

        if (!codeId) {
            return NextResponse.json(
                { success: false, message: "Code ID is required" },
                { status: 400 }
            )
        }

        // Get the code with event info
        const existingCode = await prisma.scannerCode.findUnique({
            where: { id: codeId },
            include: {
                event: {
                    select: {
                        organizer: { select: { userId: true } },
                    },
                },
            },
        })

        if (!existingCode) {
            return NextResponse.json(
                { success: false, message: "Scanner code not found" },
                { status: 404 }
            )
        }

        // Verify user has access
        let hasAccess = false
        if (session.user.role === "ADMIN") {
            hasAccess = true
        } else if (
            session.user.role === "ORGANIZER" &&
            existingCode.event.organizer?.userId === session.user.id
        ) {
            hasAccess = true
        }

        if (!hasAccess) {
            return NextResponse.json(
                { success: false, message: "Access denied" },
                { status: 403 }
            )
        }

        // Deactivate the code (don't delete to preserve usage history)
        await prisma.scannerCode.update({
            where: { id: codeId },
            data: { isActive: false },
        })

        return NextResponse.json({
            success: true,
            message: "Scanner code deactivated",
        })
    } catch (error) {
        console.error("Error deactivating scanner code:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
