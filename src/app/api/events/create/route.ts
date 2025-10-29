import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/generated/prisma"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            title,
            description,
            date,
            time,
            fullAddress,
            categoryId,
            imageUrl,
            ticketsAvailable,
            price,
            organizerWallet,
            collectionMetadata,
        } = body

        // Validate required fields
        if (
            !title ||
            !description ||
            !date ||
            !time ||
            !fullAddress ||
            !categoryId ||
            !ticketsAvailable ||
            !price ||
            !organizerWallet
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Missing required fields",
                },
                { status: 400 }
            )
        }

        // Step 1: Find or create user
        let user = await prisma.user.findUnique({
            where: { walletAddress: organizerWallet },
            include: { organizer: true },
        })

        if (!user) {
            // Create user if doesn't exist
            user = await prisma.user.create({
                data: {
                    walletAddress: organizerWallet,
                },
                include: { organizer: true },
            })
        }

        // Step 2: Find or create organizer
        let organizer = user.organizer
        if (!organizer) {
            organizer = await prisma.organizer.create({
                data: {
                    userId: user.id,
                    companyName: "Event Organizer", // Default name, can be updated later
                    description: "Professional event organizer",
                },
            })
        }

        // Step 3: Create event in database
        const event = await prisma.event.create({
            data: {
                title,
                description,
                date: new Date(date),
                time,
                fullAddress,
                imageUrl: imageUrl || "/logo.png",
                ticketsAvailable,
                ticketsSold: 0,
                price,
                schedule: ['1', '2', 'пока не работает, не обращай внимания'],
                categoryId,
                organizerId: organizer.id,
                isActive: true,
            },
        })

        // Step 4: Create NFT Collection
        try {
            const collectionResponse = await fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/collections/create`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        eventId: event.id,
                        organizerWallet,
                        totalSupply: ticketsAvailable,
                        priceInSol: price,
                        metadata: {
                            name: collectionMetadata.name || title,
                            symbol: collectionMetadata.symbol || "TICKET",
                            description: collectionMetadata.description || description,
                            image: collectionMetadata.image || imageUrl || "/logo.png",
                            eventDate: date,
                            eventTime: time,
                            location: fullAddress,
                            category: categoryId,
                            organizer: {
                                name: organizer.companyName,
                                avatar: organizer.avatar || "/logo.png",
                                description: organizer.description || "",
                            },
                        },
                    }),
                }
            )

            const collectionResult = await collectionResponse.json()

            if (collectionResult.success) {
                // Update event with collection addresses
                await prisma.event.update({
                    where: { id: event.id },
                    data: {
                        collectionNftAddress: collectionResult.collectionAddress,
                        candyMachineAddress: collectionResult.candyMachineAddress,
                    },
                })

                return NextResponse.json({
                    success: true,
                    message: "Event and collection created successfully",
                    eventId: event.id,
                    collectionAddress: collectionResult.collectionAddress,
                    candyMachineAddress: collectionResult.candyMachineAddress,
                })
            } else {
                // Collection creation failed, but event was created
                // You might want to handle this differently (e.g., delete the event or mark it as incomplete)
                return NextResponse.json({
                    success: false,
                    message: "Event created but collection creation failed: " + collectionResult.message,
                    eventId: event.id,
                })
            }
        } catch (collectionError) {
            console.error("Error creating collection:", collectionError)
            return NextResponse.json({
                success: false,
                message: "Event created but collection creation failed",
                eventId: event.id,
            })
        }
    } catch (error) {
        console.error("Error creating event:", error)
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to create event",
            },
            { status: 500 }
        )
    }
}

