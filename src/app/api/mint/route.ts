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
            include: {
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

        if (event.candyMachineAddress !== candyMachineAddress) {
            return NextResponse.json(
                { success: false, message: 'Candy Machine address mismatch' },
                { status: 400 }
            )
        }

        if (!event.organizer) {
            return NextResponse.json(
                { success: false, message: 'Event organizer not found' },
                { status: 404 }
            )
        }

        const organizerWallet = event.organizer.user.walletAddress

        console.log(`Minting ${quantity} ticket(s) for event: ${eventId}`)

        // Step 1: Check Candy Machine availability
        console.log('Step 1: Checking Candy Machine availability...')
        const candyMachineData = await getCandyMachineData(candyMachineAddress)

        if (candyMachineData.itemsRemaining < quantity) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Not enough tickets available. Only ${candyMachineData.itemsRemaining} remaining.`,
                },
                { status: 400 }
            )
        }

        console.log(`Available tickets: ${candyMachineData.itemsRemaining}`)

        // Step 2: Get or create user
        console.log('Step 2: Getting/creating user...')
        let user = await prisma.user.findUnique({
            where: { walletAddress: buyerWallet },
        })

        if (!user) {
            user = await prisma.user.create({
                data: {
                    walletAddress: buyerWallet,
                },
            })
        }

        // Step 3: Mint NFTs
        console.log('Step 3: Minting NFTs...')
        const platformSigner = loadPlatformWallet()

        const {
            nftMintAddresses,
            transactionSignature,
            totalPaid,
        } = await mintNFT({
            candyMachineAddress,
            buyerWallet,
            quantity,
            platformSigner,
        })

        console.log(`Minted ${nftMintAddresses.length} NFT(s)`)
        console.log('Transaction signature:', transactionSignature)

        // Step 4: Distribute payment (97.5% / 2.5%)
        console.log('Step 4: Distributing payment...')
        const {
            organizerShare,
            platformShare,
            transactionHash: distributionTxHash,
        } = await distributePayment({
            totalAmount: totalPaid,
            organizerWallet,
            platformWallet: platformSigner,
        })

        console.log('Payment distributed successfully')

        // Step 5: Create order in database
        console.log('Step 5: Creating order in database...')
        const order = await prisma.order.create({
            data: {
                eventId,
                userId: user.id,
                quantity,
                totalPrice: lamportsToSol(totalPaid),
                status: 'confirmed',
                transactionHash: transactionSignature,
            },
        })

        // Step 6: Create ticket records
        console.log('Step 6: Creating ticket records...')
        const ticketData = nftMintAddresses.map((nftMintAddress, index) => ({
            eventId,
            orderId: order.id,
            userId: user.id,
            nftMintAddress,
            tokenId: index + 1,
            isValid: true,
            isUsed: false,
        }))

        await prisma.ticket.createMany({
            data: ticketData,
        })

        // Step 7: Create payment distribution record
        console.log('Step 7: Creating payment distribution record...')
        // @ts-ignore - PaymentDistribution model exists but TypeScript doesn't recognize it yet
        await (prisma as any).paymentDistribution.create({
            data: {
                orderId: order.id,
                totalAmount: lamportsToSol(totalPaid),
                organizerShare: lamportsToSol(organizerShare),
                platformShare: lamportsToSol(platformShare),
                organizerWallet,
                platformWallet: platformSigner.publicKey.toBase58(),
                transactionHash: distributionTxHash,
                status: 'completed',
            },
        })

        // Step 8: Update event tickets sold
        console.log('Step 8: Updating event tickets sold...')
        await prisma.event.update({
            where: { id: eventId },
            data: {
                ticketsSold: {
                    increment: quantity,
                },
            },
        })

        console.log('Mint completed successfully')

        return NextResponse.json({
            success: true,
            nftMintAddresses,
            transactionSignature,
            organizerPayment: {
                amount: lamportsToSol(organizerShare),
                transactionHash: distributionTxHash,
            },
            platformFee: {
                amount: lamportsToSol(platformShare),
            },
            orderId: order.id,
            message: 'NFT tickets minted successfully',
        })
    } catch (error: any) {
        console.error('Error minting NFT:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to mint NFT tickets',
                error: error.message || String(error),
            },
            { status: 500 }
        )
    }
}

