import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const event = await prisma.event.findUnique({
            where: { id },
            include: {
                category: true,
                organizer: true
            }
        })

        if (!event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            id: event.id,
            title: event.title,
            company: event.organizer?.companyName || 'Unknown Company',
            price: event.price,
            date: event.date.toISOString().split('T')[0],
            time: event.time,
            ticketsAvailable: event.ticketsAvailable,
            imageUrl: event.imageUrl,
            category: event.category.name,
            description: event.description,
            fullAddress: event.fullAddress,
            organizer: {
                name: event.organizer?.companyName || 'Unknown Organizer',
                avatar: event.organizer?.avatar,
                description: event.organizer?.description
            },
            schedule: event.schedule
        })
    } catch (error) {
        console.error('Error fetching event:', error)
        return NextResponse.json(
            { error: 'Failed to fetch event' },
            { status: 500 }
        )
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()

        const event = await prisma.event.update({
            where: { id },
            data: body,
            include: {
                category: true,
                organizer: true
            }
        })

        return NextResponse.json(event)
    } catch (error) {
        console.error('Error updating event:', error)
        return NextResponse.json(
            { error: 'Failed to update event' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        await prisma.event.delete({
            where: { id }
        })

        return NextResponse.json({ message: 'Event deleted successfully' })
    } catch (error) {
        console.error('Error deleting event:', error)
        return NextResponse.json(
            { error: 'Failed to delete event' },
            { status: 500 }
        )
    }
}
