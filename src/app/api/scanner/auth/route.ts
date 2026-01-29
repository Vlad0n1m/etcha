import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

/**
 * POST /api/scanner/auth - Validate scanner code for an event
 * 
 * Used to authenticate scanner before starting to scan tickets.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { eventId, scannerCode } = body

        if (!eventId) {
            return NextResponse.json(
                { success: false, message: "Event ID is required" },
                { status: 400 }
            )
        }

        // Check session-based authorization first
        const session = await auth()
        if (session?.user) {
            // Admin has access to all events
            if (session.user.role === "ADMIN") {
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

                return NextResponse.json({
                    success: true,
                    authMethod: "session",
                    role: "admin",
                    event,
                })
            }

            // Check if user is the organizer of this event
            if (session.user.role === "ORGANIZER") {
                const event = await prisma.event.findFirst({
                    where: {
                        id: eventId,
                        organizer: {
                            userId: session.user.id,
                        },
                    },
                    select: {
                        id: true,
                        title: true,
                        date: true,
                        ticketsAvailable: true,
                        ticketsSold: true,
                    },
                })

                if (event) {
                    return NextResponse.json({
                        success: true,
                        authMethod: "session",
                        role: "organizer",
                        event,
                    })
                }
            }
        }

        // Check scanner code if provided
        if (scannerCode) {
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
                include: {
                    event: {
                        select: {
                            id: true,
                            title: true,
                            date: true,
                            ticketsAvailable: true,
                            ticketsSold: true,
                        },
                    },
                },
            })

            if (code) {
                return NextResponse.json({
                    success: true,
                    authMethod: "code",
                    role: "staff",
                    scannerName: code.name,
                    event: code.event,
                })
            }

            return NextResponse.json(
                { success: false, message: "Invalid or expired scanner code" },
                { status: 401 }
            )
        }

        return NextResponse.json(
            { success: false, message: "Unauthorized. Please login or provide a scanner code." },
            { status: 401 }
        )
    } catch (error) {
        console.error("Error authenticating scanner:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
