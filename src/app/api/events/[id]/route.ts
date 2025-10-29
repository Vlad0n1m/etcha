import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/generated/prisma"

const prisma = new PrismaClient()

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Fetch event with related data
        const event = await prisma.event.findUnique({
            where: { id },
            include: {
                category: true,
                organizer: {
                    include: {
                        user: true,
                    },
                },
            },
        })

        if (!event) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Event not found",
                },
                { status: 404 }
            )
        }

        // Format response to match frontend EventData interface
        const formattedEvent = {
            id: event.id,
            title: event.title,
            company: event.organizer.companyName,
            price: event.price,
            date: event.date.toISOString().split("T")[0], // Format as YYYY-MM-DD
            time: event.time,
            ticketsAvailable: event.ticketsAvailable - event.ticketsSold,
            imageUrl: event.imageUrl,
            category: event.category.name,
            description: event.description,
            fullAddress: event.fullAddress,
            organizer: {
                name: event.organizer.companyName,
                avatar: event.organizer.avatar || "/logo.png",
                description: event.organizer.description || "Event organizer",
            },
            schedule: event.schedule ? JSON.parse(event.schedule) : [],
            candyMachineAddress: event.candyMachineAddress,
            collectionNftAddress: event.collectionNftAddress,
        }

        return NextResponse.json({
            success: true,
            event: formattedEvent,
        })
    } catch (error) {
        console.error("Error fetching event:", error)
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to fetch event",
            },
            { status: 500 }
        )
    }
}

