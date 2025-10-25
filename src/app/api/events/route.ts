import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createEventSchema = z.object({
    title: z.string().min(1),
    company: z.string().min(1),
    price: z.number().min(0),
    date: z.string(),
    time: z.string(),
    ticketsAvailable: z.number().min(1),
    imageUrl: z.string().url(),
    description: z.string().min(1),
    fullAddress: z.string().min(1),
    organizerName: z.string().min(1),
    organizerAvatar: z.string().url(),
    organizerDescription: z.string().min(1),
    schedule: z.array(z.string()).optional(),
    categoryId: z.string().min(1),
})

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')
        const date = searchParams.get('date')

        const where: any = { isActive: true }

        if (category && category !== 'all') {
            where.category = {
                value: category.toLowerCase()
            }
        }

        if (date) {
            where.date = {
                gte: new Date(date),
                lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000) // Next day
            }
        }

        const events = await prisma.event.findMany({
            where,
            include: {
                category: {
                    select: {
                        name: true,
                        value: true
                    }
                },
                organizer: {
                    select: {
                        companyName: true,
                        avatar: true
                    }
                }
            },
            orderBy: {
                date: 'asc'
            }
        })

        return NextResponse.json(events.map(event => ({
            id: event.id,
            title: event.title,
            price: event.price,
            date: event.date.toISOString().split('T')[0],
            time: event.time,
            ticketsAvailable: event.ticketsAvailable,
            imageUrl: event.imageUrl,
            category: event.category.name,
            organizer: event.organizer ? {
                name: event.organizer.companyName,
                avatar: event.organizer.avatar
            } : null
        })))
    } catch (error) {
        console.error('Error fetching events:', error)
        return NextResponse.json(
            { error: 'Failed to fetch events' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const validatedData = createEventSchema.parse(body)

        const event = await prisma.event.create({
            data: validatedData,
            include: {
                category: true
            }
        })

        return NextResponse.json(event, { status: 201 })
    } catch (error) {
        console.error('Error creating event:', error)
        return NextResponse.json(
            { error: 'Failed to create event' },
            { status: 500 }
        )
    }
}
