import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import {
    mintNFT,
    distributePayment,
    getCandyMachineData,
} from '@/lib/services/CandyMachineService'
import { loadPlatformWallet, isValidSolanaAddress, lamportsToSol } from '@/lib/utils/wallet'

const prisma = new PrismaClient()

/**
 * POST /api/mint
 * 
 * Mint NFT ticket(s) from Candy Machine
 * Automatically distributes payment: 97.5% to organizer, 2.5% to platform
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate required fields
        const {
            eventId,
            candyMachineAddress,
            buyerWallet,
            quantity,
        } = body

        if (!eventId || !candyMachineAddress || !buyerWallet || !quantity) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Validate buyer wallet address
        if (!isValidSolanaAddress(buyerWallet)) {
            return NextResponse.json(
                { success: false, message: 'Invalid buyer wallet address' },
                { status: 400 }
            )
        }

        // Validate quantity
        if (quantity < 1 || quantity > 10) {
            return NextResponse.json(
                { success: false, message: 'Quantity must be between 1 and 10' },
                { status: 400 }
            )
        }

        // Get event from database
        const event = await prisma.event.findUnique({
            where: { id: eventId },
        })

        if (!event) {
            return NextResponse.json(
                { success: false, message: 'Event not found' },
                { status: 404 }
            )
        }

        if (event.candyMachineAddress !== candyMachineAddress) {
            return NextResponse.json(
                { success: false, message: 'Candy Machine address mismatch' },
                { status: 400 }
            )
        }

        console.log(`Preparing mint transaction for event: ${eventId}`)

        // Step 1: Check Candy Machine availability
        const candyMachineData = await getCandyMachineData(candyMachineAddress)

        if (!candyMachineData.isFullyLoaded) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Candy Machine is not fully loaded. Please wait for all items to be added.`,
                },
                { status: 400 }
            )
        }

        if (candyMachineData.itemsRemaining < quantity) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Not enough tickets available. Only ${candyMachineData.itemsRemaining} remaining.`,
                },
                { status: 400 }
            )
        }

        // Step 2: Construct Mint Transaction
        const { constructMintTransaction } = await import('@/lib/services/CandyMachineService')

        const { transaction, mintAddresses } = await constructMintTransaction({
            candyMachineAddress,
            buyerWallet,
            quantity,
            pricePerNFT: event.price,
        })

        return NextResponse.json({
            success: true,
            transaction, // Base64 serialized transaction
            mintAddresses,
            message: 'Transaction constructed successfully',
        })

    } catch (error: any) {
        console.error('Error preparing mint transaction:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to prepare mint transaction',
                error: error.message || String(error),
            },
            { status: 500 }
        )
    }
}

