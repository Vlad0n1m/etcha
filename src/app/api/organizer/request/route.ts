import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(request: NextRequest) {
    try {
        // Get current session
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized. Please sign in." },
                { status: 401 }
            )
        }

        // Check if user is already an organizer
        const existingOrganizer = await prisma.organizer.findUnique({
            where: { userId: session.user.id },
        })

        if (existingOrganizer) {
            return NextResponse.json(
                { error: "You already have an organizer profile", organizer: existingOrganizer },
                { status: 400 }
            )
        }

        const body = await request.json()
        const { companyName, description, website, email, phone, address } = body

        // Validate required fields
        if (!companyName || !description || !email) {
            return NextResponse.json(
                { error: "Company name, description, and email are required" },
                { status: 400 }
            )
        }

        // Create organizer profile with PENDING status
        const organizer = await prisma.organizer.create({
            data: {
                userId: session.user.id,
                companyName,
                description,
                website: website || null,
                email,
                phone: phone || null,
                address: address || null,
                status: "PENDING",
                requestedAt: new Date(),
            },
        })

        // Update user role to ORGANIZER
        await prisma.user.update({
            where: { id: session.user.id },
            data: { role: "ORGANIZER" },
        })

        return NextResponse.json({
            success: true,
            organizer,
            message: "Organizer request submitted successfully",
        })
    } catch (error) {
        console.error("Organizer request error:", error)
        return NextResponse.json(
            { error: "Failed to submit organizer request" },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest) {
    try {
        // Get current session
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        const organizer = await prisma.organizer.findUnique({
            where: { userId: session.user.id },
        })

        if (!organizer) {
            return NextResponse.json(
                { error: "Organizer profile not found" },
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
            { error: "Failed to get organizer profile" },
            { status: 500 }
        )
    }
}
