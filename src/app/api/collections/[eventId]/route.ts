import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { getCandyMachineData } from '@/lib/services/CandyMachineService'

const prisma = new PrismaClient()

/**
 * GET /api/collections/[eventId]
 * 
 * Get collection data for an event including Candy Machine stats
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ eventId: string }> }
) {
    try {
        const { eventId } = await params

        if (!eventId) {
            return NextResponse.json(
                { success: false, message: 'Event ID is required' },
                { status: 400 }
            )
        }

        console.log(`Fetching collection data for event: ${eventId}`)

        // Get event from database
        const event = await prisma.event.findUnique({
            where: { id: eventId },
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
                { success: false, message: 'Event not found' },
                { status: 404 }
            )
        }

        if (!event.collectionNftAddress || !event.candyMachineAddress) {
            return NextResponse.json(
                { success: false, message: 'Event does not have a collection' },
                { status: 404 }
            )
        }

        // Get Candy Machine data
        const candyMachineData = await getCandyMachineData(event.candyMachineAddress)

        // Calculate payment distribution stats
        const totalRevenue = event.ticketsSold * event.price
        const organizerRevenue = totalRevenue * 0.975
        const platformFee = totalRevenue * 0.025

        return NextResponse.json({
            success: true,
            eventId,
            collectionAddress: event.collectionNftAddress,
            candyMachineAddress: event.candyMachineAddress,
            metadata: {
                name: event.title,
                description: event.description,
                image: event.imageUrl,
                eventDate: event.date,
                eventTime: event.time,
                location: event.fullAddress,
                category: event.category.name,
                organizer: event.organizer
                    ? {
                        name: event.organizer.companyName,
                        avatar: event.organizer.avatar,
                        description: event.organizer.description,
                    }
                    : null,
            },
            stats: {
                totalSupply: candyMachineData.itemsAvailable,
                sold: candyMachineData.itemsRedeemed,
                remaining: candyMachineData.itemsRemaining,
                price: candyMachineData.price,
                priceInLamports: candyMachineData.priceInLamports,
            },
            revenue: {
                total: totalRevenue,
                organizerShare: organizerRevenue,
                platformFee: platformFee,
            },
        })
    } catch (error: any) {
        console.error('Error fetching collection data:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to fetch collection data',
                error: error.message || String(error),
            },
            { status: 500 }
        )
    }
}

