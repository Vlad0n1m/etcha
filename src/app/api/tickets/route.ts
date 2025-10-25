import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
    try {
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

        // Get user tickets
        const tickets = await prisma.ticket.findMany({
            where: {
                userId: decoded.userId,
                isValid: true
            },
            include: {
                event: {
                    include: {
                        category: true,
                        organizer: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(tickets.map(ticket => ({
            id: ticket.id,
            nftMintAddress: ticket.nftMintAddress,
            tokenId: ticket.tokenId,
            isValid: ticket.isValid,
            isUsed: ticket.isUsed,
            event: {
                id: ticket.event.id,
                title: ticket.event.title,
                company: ticket.event.organizer?.companyName || 'Unknown Company',
                date: ticket.event.date.toISOString().split('T')[0],
                time: ticket.event.time,
                imageUrl: ticket.event.imageUrl,
                category: ticket.event.category.name
            }
        })))
    } catch (error) {
        console.error('Error fetching tickets:', error)
        return NextResponse.json(
            { error: 'Failed to fetch tickets' },
            { status: 500 }
        )
    }
}
