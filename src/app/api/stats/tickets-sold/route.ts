import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
    try {
        // Count all tickets (if a ticket exists, it was sold)
        const count = await prisma.ticket.count()

        return NextResponse.json({
            success: true,
            count
        })
    } catch (error) {
        console.error("Error fetching tickets sold:", error)
        // Return a fallback count on error
        return NextResponse.json({
            success: true,
            count: 0
        })
    }
}
