import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const purchaseSchema = z.object({
    quantity: z.number().min(1),
    walletAddress: z.string().min(1)
})

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { quantity, walletAddress } = purchaseSchema.parse(body)

        // Get authorization header
        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthenticated' },
                { status: 401 }
            )
        }

        // Verify JWT token
        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

        if (decoded.walletAddress !== walletAddress) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            )
        }

        // Get event
        const event = await prisma.event.findUnique({
            where: { id }
        })

        if (!event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            )
        }

        if (event.ticketsAvailable < quantity) {
            return NextResponse.json(
                { error: 'Insufficient tickets' },
                { status: 409 }
            )
        }

        // Get or create user
        let user = await prisma.user.findUnique({
            where: { walletAddress }
        })

        if (!user) {
            user = await prisma.user.create({
                data: { walletAddress }
            })
        }

        // Calculate total price
        const totalPrice = event.price * quantity

        // Create order
        const order = await prisma.order.create({
            data: {
                eventId: id,
                userId: user.id,
                quantity,
                totalPrice,
                status: 'pending'
            }
        })

        // TODO: Implement NFT minting here
        // For now, we'll simulate the minting process
        const nftMintAddress = `mint_${order.id}_${Date.now()}`

        // Update event tickets available
        await prisma.event.update({
            where: { id },
            data: {
                ticketsAvailable: event.ticketsAvailable - quantity,
                ticketsSold: event.ticketsSold + quantity
            }
        })

        // Update order with NFT mint address
        const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: {
                status: 'confirmed',
                nftMintAddress
            }
        })

        // Create tickets
        const tickets = []
        for (let i = 0; i < quantity; i++) {
            const ticket = await prisma.ticket.create({
                data: {
                    eventId: id,
                    orderId: order.id,
                    userId: user.id,
                    nftMintAddress: `${nftMintAddress}_${i}`,
                    tokenId: i + 1
                }
            })
            tickets.push(ticket)
        }

        return NextResponse.json({
            orderId: order.id,
            eventId: id,
            quantity,
            totalPrice,
            status: 'confirmed',
            nftMintAddress,
            tickets: tickets.map(t => ({
                id: t.id,
                nftMintAddress: t.nftMintAddress,
                tokenId: t.tokenId
            }))
        })
    } catch (error) {
        console.error('Error processing purchase:', error)
        return NextResponse.json(
            { error: 'Purchase failed' },
            { status: 500 }
        )
    }
}
