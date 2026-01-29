import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getPOAPService } from "@/lib/solana/POAPService"

/**
 * POST /api/scanner/scan - Scan a ticket QR code
 * 
 * Validates the ticket, marks it as used, creates attendance record,
 * and triggers async POAP badge minting.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { ticketId, nftAddress, eventId, scannerCode } = body

        // Validate required fields
        if (!ticketId || !eventId) {
            return NextResponse.json(
                { success: false, message: "Missing required fields: ticketId and eventId" },
                { status: 400 }
            )
        }

        // Authorize the scanner (either via session or scanner code)
        let scannedBy: string
        let isAuthorized = false

        // Check session-based authorization first
        const session = await auth()
        if (session?.user) {
            // Check if user is organizer or admin
            if (session.user.role === "ADMIN") {
                isAuthorized = true
                scannedBy = session.user.id
            } else if (session.user.role === "ORGANIZER") {
                // Check if user is the organizer of this event
                const event = await prisma.event.findUnique({
                    where: { id: eventId },
                    select: {
                        organizerId: true,
                        organizer: {
                            select: { userId: true },
                        },
                    },
                })
                if (event?.organizer?.userId === session.user.id) {
                    isAuthorized = true
                    scannedBy = session.user.id
                }
            }
        }

        // If not authorized via session, check scanner code
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

            if (code) {
                isAuthorized = true
                scannedBy = `scanner:${code.id}`

                // Increment usage count
                await prisma.scannerCode.update({
                    where: { id: code.id },
                    data: { usageCount: { increment: 1 } },
                })
            }
        }

        if (!isAuthorized) {
            return NextResponse.json(
                { success: false, message: "Unauthorized. Please login or provide a valid scanner code." },
                { status: 401 }
            )
        }

        // Find the ticket with ticket type info
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        walletAddress: true,
                        internalWalletAddress: true,
                    },
                },
                ticketType: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                    },
                },
                attendance: true,
            },
        })

        if (!ticket) {
            return NextResponse.json(
                { success: false, message: "Ticket not found" },
                { status: 404 }
            )
        }

        // Verify ticket belongs to the event
        if (ticket.eventId !== eventId) {
            return NextResponse.json(
                { success: false, message: "Ticket does not belong to this event" },
                { status: 400 }
            )
        }

        // Verify NFT address matches (optional additional validation)
        if (nftAddress && ticket.nftMintAddress !== nftAddress && ticket.assetId !== nftAddress) {
            return NextResponse.json(
                { success: false, message: "NFT address mismatch" },
                { status: 400 }
            )
        }

        // Check if ticket is valid
        if (!ticket.isValid) {
            return NextResponse.json(
                { success: false, message: "Ticket is invalid" },
                { status: 400 }
            )
        }

        // Check if already used
        if (ticket.isUsed || ticket.attendance) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Ticket already used",
                    alreadyUsed: true,
                    attendance: ticket.attendance ? {
                        id: ticket.attendance.id,
                        scannedAt: ticket.attendance.scannedAt,
                        poapStatus: ticket.attendance.poapStatus,
                        poapAssetId: ticket.attendance.poapAssetId,
                    } : null,
                },
                { status: 409 }
            )
        }

        // Create attendance record and mark ticket as used in a transaction
        const attendance = await prisma.$transaction(async (tx) => {
            // Mark ticket as used
            await tx.ticket.update({
                where: { id: ticketId },
                data: { isUsed: true },
            })

            // Create attendance record
            return tx.attendance.create({
                data: {
                    ticketId,
                    eventId,
                    userId: ticket.userId,
                    scannedBy: scannedBy!,
                    poapStatus: "pending",
                },
            })
        })

        // Start async POAP minting using shared platform tree (don't await - let it run in background)
        // Fire and forget - POAP minting happens in background
        const poapService = getPOAPService()
        poapService.mintPOAPAsync(attendance.id).catch((error) => {
            console.error("Error in async POAP mint:", error)
        })

        return NextResponse.json({
            success: true,
            message: "Ticket scanned successfully",
            attendance: {
                id: attendance.id,
                scannedAt: attendance.scannedAt,
                poapStatus: attendance.poapStatus,
            },
            ticket: {
                id: ticket.id,
                tokenId: ticket.tokenId,
                ownerName: ticket.user.name,
                ticketType: ticket.ticketType?.name || "Standard",
                price: ticket.ticketType?.price || null,
            },
            event: {
                id: ticket.event.id,
                title: ticket.event.title,
            },
        })
    } catch (error) {
        console.error("Error scanning ticket:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
