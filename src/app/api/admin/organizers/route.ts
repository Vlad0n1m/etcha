import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user || session.user.role !== "ADMIN") {
            return NextResponse.json(
                { error: "Unauthorized. Admin access required." },
                { status: 403 }
            )
        }

        const organizers = await prisma.organizer.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: [
                { status: "asc" }, // PENDING first
                { requestedAt: "desc" },
            ],
        })

        return NextResponse.json({
            success: true,
            organizers,
        })
    } catch (error) {
        console.error("Get organizers error:", error)
        return NextResponse.json(
            { error: "Failed to get organizers" },
            { status: 500 }
        )
    }
}
