import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * GET /api/metadata/poap/[eventId]
 * 
 * Returns metadata for POAP (Proof of Attendance) badges for a specific event.
 * This endpoint is used by the NFT metadata URI when minting POAP badges.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ eventId: string }> }
) {
    try {
        const { eventId } = await params

        // Get event details
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: {
                id: true,
                title: true,
                description: true,
                imageUrl: true,
                date: true,
                time: true,
                fullAddress: true,
                organizer: {
                    select: {
                        companyName: true,
                    },
                },
            },
        })

        if (!event) {
            return NextResponse.json(
                { error: "Event not found" },
                { status: 404 }
            )
        }

        // Format date
        const eventDate = new Date(event.date)
        const formattedDate = eventDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        })

        // Build NFT metadata in Metaplex standard format
        const metadata = {
            name: `${event.title} - POAP`,
            symbol: "POAP",
            description: `Proof of Attendance for "${event.title}" on ${formattedDate}. ${event.description || ""}`,
            image: event.imageUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/logo.png`,
            external_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/event/${event.id}`,
            attributes: [
                {
                    trait_type: "Event",
                    value: event.title,
                },
                {
                    trait_type: "Date",
                    value: formattedDate,
                },
                {
                    trait_type: "Time",
                    value: event.time || "TBA",
                },
                {
                    trait_type: "Location",
                    value: event.fullAddress || "TBA",
                },
                {
                    trait_type: "Organizer",
                    value: event.organizer?.companyName || "Etcha",
                },
                {
                    trait_type: "Type",
                    value: "Proof of Attendance",
                },
                {
                    trait_type: "Year",
                    value: eventDate.getFullYear().toString(),
                },
            ],
            properties: {
                files: [
                    {
                        uri: event.imageUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/logo.png`,
                        type: "image/png",
                    },
                ],
                category: "image",
                creators: [
                    {
                        address: process.env.PLATFORM_WALLET_ADDRESS || "",
                        share: 100,
                    },
                ],
            },
            // Additional metadata for POAP identification
            collection: {
                name: `${event.title} - POAP Collection`,
                family: "Etcha POAP",
            },
        }

        return NextResponse.json(metadata, {
            headers: {
                "Cache-Control": "public, max-age=3600", // Cache for 1 hour
            },
        })
    } catch (error) {
        console.error("Error generating POAP metadata:", error)
        return NextResponse.json(
            { error: "Failed to generate metadata" },
            { status: 500 }
        )
    }
}
