import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Event } from '@/generated/prisma'
import { z } from 'zod'

const createEventSchema = z.object({
    title: z.string().min(1),
    price: z.number().min(0),
    date: z.string(),
    time: z.string(),
    ticketsAvailable: z.number().min(1),
    imageUrl: z.string().url(),
    description: z.string().min(1),
    fullAddress: z.string().min(1),
    schedule: z.array(z.string()).optional(),
    categoryId: z.string().min(1),
    // Organizer fields (will be used to create/update organizer)
    company: z.string().min(1),
    organizerName: z.string().min(1),
    organizerAvatar: z.string().url(),
    organizerDescription: z.string().min(1),
})

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const category = searchParams.get('category')
        const date = searchParams.get('date')

        const where: Record<string, unknown> = { isActive: true }

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
            description: event.description,
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

        // Get auth header to verify organizer
        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthenticated' },
                { status: 401 }
            )
        }

        // Extract wallet address from JWT or token (simplified - should verify JWT properly)
        // For now, get organizer wallet from body or user context
        const walletAddress = body.walletAddress || ''

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { walletAddress },
            include: { organizer: true }
        })

        if (!user) {
            user = await prisma.user.create({
                data: { walletAddress },
                include: { organizer: true }
            })
        }

        // Create or update organizer
        let organizer = user.organizer
        if (!organizer) {
            organizer = await prisma.organizer.create({
                data: {
                    userId: user.id,
                    companyName: validatedData.company,
                    description: validatedData.organizerDescription,
                    avatar: validatedData.organizerAvatar,
                }
            })
        } else {
            // Update organizer info
            organizer = await prisma.organizer.update({
                where: { id: organizer.id },
                data: {
                    companyName: validatedData.company,
                    description: validatedData.organizerDescription,
                    avatar: validatedData.organizerAvatar,
                }
            })
        }

        // Find category by value (since form sends value, not ID)
        const category = await prisma.category.findUnique({
            where: { value: validatedData.categoryId }
        })

        if (!category) {
            return NextResponse.json(
                { error: `Category '${validatedData.categoryId}' not found` },
                { status: 400 }
            )
        }

        // Create encoder for streaming
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const sendProgress = (message: string, step?: string, progress?: number) => {
                        const data = JSON.stringify({ message, step, progress, timestamp: Date.now() })
                        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
                    }

                    sendProgress('🚀 Starting event creation process...', 'init', 0)

                    // Create blockchain infrastructure FIRST before creating event
                    const { SolanaService } = await import('@/lib/solana/SolanaService')
                    const { CollectionService } = await import('@/lib/solana/CollectionService')
                    const { CandyMachineService } = await import('@/lib/solana/CandyMachineService')

                    sendProgress('⚙️ Initializing Solana services...', 'init', 10)
                    const solanaService = new SolanaService()
                    const collectionService = new CollectionService()
                    const candyMachineService = new CandyMachineService(solanaService, collectionService, sendProgress)

                    sendProgress('📦 Preparing event data...', 'prepare', 15)

                    // Create a temporary event object for collection creation
                    const tempEvent: Event = {
                        id: 'temp',
                        title: validatedData.title,
                        price: validatedData.price,
                        date: new Date(validatedData.date),
                        time: validatedData.time,
                        ticketsAvailable: validatedData.ticketsAvailable,
                        ticketsSold: 0,
                        imageUrl: validatedData.imageUrl,
                        description: validatedData.description,
                        fullAddress: validatedData.fullAddress,
                        isActive: true,
                        schedule: validatedData.schedule || [],
                        categoryId: category.id,
                        organizerId: organizer.id,
                        collectionNftAddress: null,
                        candyMachineAddress: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }

                    // Create collection representation
                    const collection = await collectionService.createCollection(
                        tempEvent,
                        walletAddress,
                        validatedData.organizerName
                    )

                    // Import PublicKey for organizer wallet
                    const { PublicKey } = await import('@solana/web3.js')
                    const organizerPublicKey = new PublicKey(walletAddress)

                    // Create FULL collection: Collection NFT + Candy Machine + all items with guards
                    sendProgress('🚀 Creating full blockchain infrastructure...', 'blockchain', 20)
                    const { collectionNftAddress, candyMachineAddress } = await candyMachineService.createFullCollection(
                        collection,
                        organizerPublicKey
                    )

                    sendProgress('💾 Saving event to database...', 'database', 95)

                    // Now create event in database WITH both collection and candy machine addresses
                    const event = await prisma.event.create({
                        data: {
                            title: validatedData.title,
                            price: validatedData.price,
                            date: validatedData.date,
                            time: validatedData.time,
                            ticketsAvailable: validatedData.ticketsAvailable,
                            imageUrl: validatedData.imageUrl,
                            description: validatedData.description,
                            fullAddress: validatedData.fullAddress,
                            schedule: validatedData.schedule || [],
                            categoryId: category.id,
                            organizerId: organizer.id,
                            collectionNftAddress,
                            candyMachineAddress, // Now created immediately with guards!
                        },
                        include: {
                            category: true,
                            organizer: true
                        }
                    })

                    sendProgress('✅ Event created successfully!', 'complete', 100)

                    // Send final result
                    const resultData = JSON.stringify({
                        type: 'result',
                        data: {
                            ...event,
                            collectionNftAddress,
                            candyMachineAddress,
                        }
                    })
                    controller.enqueue(encoder.encode(`data: ${resultData}\n\n`))
                    controller.close()
                } catch (error) {
                    console.error('Error in stream:', error)
                    const errorData = JSON.stringify({
                        type: 'error',
                        message: error instanceof Error ? error.message : 'Failed to create event'
                    })
                    controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
                    controller.close()
                }
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        })
    } catch (error) {
        console.error('Error creating event:', error)
        return NextResponse.json(
            { error: 'Failed to create event' },
            { status: 500 }
        )
    }
}
