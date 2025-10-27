import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const preparePurchaseSchema = z.object({
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
        const { quantity, walletAddress } = preparePurchaseSchema.parse(body)

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
                { error: 'Insufficient tickets available' },
                { status: 409 }
            )
        }

        // Prepare mint transaction (will create Candy Machine if needed)
        const { SolanaService } = await import('@/lib/solana/SolanaService')
        const { CollectionService } = await import('@/lib/solana/CollectionService')
        const { CandyMachineService } = await import('@/lib/solana/CandyMachineService')

        const solanaService = new SolanaService()
        const collectionService = new CollectionService()
        const candyMachineService = new CandyMachineService(solanaService, collectionService)

        // Prepare the mint transaction (creates Candy Machine if first time)
        const { transaction, candyMachineAddress } = await candyMachineService.prepareMintTransaction(
            id,
            walletAddress,
            quantity
        )

        // If Candy Machine was just created, update database
        if (!event.candyMachineAddress && candyMachineAddress) {
            await prisma.event.update({
                where: { id },
                data: { candyMachineAddress }
            })
            console.log(`✅ Candy Machine address saved to database: ${candyMachineAddress}`)
        }

        return NextResponse.json({
            transaction,
            candyMachineAddress,
            eventId: id,
            quantity,
            totalPrice: event.price * quantity,
            organizerReceives: event.price * quantity, // 100% goes to organizer (2.5% royalty enforced on-chain)
            message: 'Transaction prepared. Please sign and send the transaction from your wallet.'
        })
    } catch (error) {
        console.error('Error preparing purchase:', error)
        return NextResponse.json(
            { error: `Failed to prepare purchase: ${(error as Error).message}` },
            { status: 500 }
        )
    }
}

