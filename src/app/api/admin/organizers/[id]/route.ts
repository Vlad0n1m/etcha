import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await auth()

        if (!session?.user || session.user.role !== "ADMIN") {
            return NextResponse.json(
                { error: "Unauthorized. Admin access required." },
                { status: 403 }
            )
        }

        const { id } = await params
        const body = await request.json()
        const { action, rejectionNote } = body

        if (!action || !["approve", "reject"].includes(action)) {
            return NextResponse.json(
                { error: "Invalid action. Use 'approve' or 'reject'." },
                { status: 400 }
            )
        }

        // Find organizer
        const organizer = await prisma.organizer.findUnique({
            where: { id },
        })

        if (!organizer) {
            return NextResponse.json(
                { error: "Organizer not found" },
                { status: 404 }
            )
        }

        // Update organizer status
        const updatedOrganizer = await prisma.organizer.update({
            where: { id },
            data: {
                status: action === "approve" ? "APPROVED" : "REJECTED",
                approvedAt: action === "approve" ? new Date() : null,
                approvedBy: action === "approve" ? session.user.id : null,
                rejectionNote: action === "reject" ? rejectionNote : null,
                isVerified: action === "approve",
            },
        })

        return NextResponse.json({
            success: true,
            organizer: updatedOrganizer,
            message: `Organizer ${action === "approve" ? "approved" : "rejected"} successfully`,
        })
    } catch (error) {
        console.error("Update organizer error:", error)
        return NextResponse.json(
            { error: "Failed to update organizer" },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await auth()

        if (!session?.user || session.user.role !== "ADMIN") {
            return NextResponse.json(
                { error: "Unauthorized. Admin access required." },
                { status: 403 }
            )
        }

        const { id } = await params

        const organizer = await prisma.organizer.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        walletAddress: true,
                    },
                },
                events: {
                    select: {
                        id: true,
                        title: true,
                        date: true,
                    },
                },
            },
        })

        if (!organizer) {
            return NextResponse.json(
                { error: "Organizer not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            organizer,
        })
    } catch (error) {
        console.error("Get organizer error:", error)
        return NextResponse.json(
            { error: "Failed to get organizer" },
            { status: 500 }
        )
    }
}
