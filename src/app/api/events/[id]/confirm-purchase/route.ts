import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { Connection, PublicKey } from '@solana/web3.js'
import jwt from 'jsonwebtoken'

const confirmPurchaseSchema = z.object({
    transactionSignature: z.string().min(1),
    walletAddress: z.string().min(1),
    quantity: z.number().min(1)
})

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { transactionSignature, walletAddress, quantity } = confirmPurchaseSchema.parse(body)

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

        // Verify transaction on blockchain
        const { SolanaService } = await import('@/lib/solana/SolanaService')
        const solanaService = new SolanaService()
        const connection = solanaService.getConnection()

        console.log('🔍 Verifying transaction:', transactionSignature)

        // Wait for transaction confirmation with retries
        let confirmed = false
        let attempts = 0
        const maxAttempts = 10

        while (!confirmed && attempts < maxAttempts) {
            try {
                const status = await connection.getSignatureStatus(transactionSignature, {
                    searchTransactionHistory: true
                })

                if (status?.value?.confirmationStatus === 'confirmed' ||
                    status?.value?.confirmationStatus === 'finalized') {
                    confirmed = true
                    console.log('✅ Transaction confirmed on blockchain')
                } else if (status?.value?.err) {
                    throw new Error(`Transaction failed on blockchain: ${JSON.stringify(status.value.err)}`)
                } else {
                    console.log(`⏳ Waiting for confirmation... Attempt ${attempts + 1}/${maxAttempts}`)
                    await new Promise(resolve => setTimeout(resolve, 2000))
                    attempts++
                }
            } catch (error) {
                console.error('Error checking transaction status:', error)
                attempts++
                if (attempts >= maxAttempts) {
                    throw new Error('Transaction confirmation timeout')
                }
                await new Promise(resolve => setTimeout(resolve, 2000))
            }
        }

        if (!confirmed) {
            return NextResponse.json(
                { error: 'Transaction not confirmed. Please try again.' },
                { status: 400 }
            )
        }

        // Get transaction details to find minted NFT
        const transaction = await connection.getParsedTransaction(transactionSignature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed'
        })

        if (!transaction) {
            return NextResponse.json(
                { error: 'Transaction not found on blockchain' },
                { status: 404 }
            )
        }

        // Extract NFT mint addresses from transaction
        console.log('📦 Extracting NFT addresses from transaction...')
        const nftAddresses: string[] = []

        // Look for new token accounts created in the transaction
        if (transaction.meta?.postTokenBalances) {
            for (const balance of transaction.meta.postTokenBalances) {
                // Check if this is a new NFT (amount = 1, decimals = 0)
                if (balance.uiTokenAmount.decimals === 0 &&
                    balance.uiTokenAmount.uiAmount === 1 &&
                    balance.owner === walletAddress) {
                    nftAddresses.push(balance.mint)
                    console.log('✅ Found NFT mint:', balance.mint)
                }
            }
        }

        if (nftAddresses.length === 0) {
            return NextResponse.json(
                { error: 'No NFT found in transaction. Transaction may still be processing.' },
                { status: 400 }
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

        // Create order as confirmed
        const order = await prisma.order.create({
            data: {
                eventId: id,
                userId: user.id,
                quantity,
                totalPrice,
                status: 'confirmed',
                transactionHash: transactionSignature
            }
        })

        // Create tickets with minimal data - blockchain is source of truth
        const tickets = []
        for (let i = 0; i < nftAddresses.length; i++) {
            const ticket = await prisma.ticket.create({
                data: {
                    eventId: id,
                    orderId: order.id,
                    userId: user.id,
                    nftMintAddress: nftAddresses[i],
                    tokenId: event.ticketsSold + i + 1, // Sequential number for reference
                    metadataUri: null // Not needed, query from blockchain
                }
            })
            tickets.push(ticket)
        }

        // Update event tickets available
        await prisma.event.update({
            where: { id },
            data: {
                ticketsAvailable: event.ticketsAvailable - quantity,
                ticketsSold: event.ticketsSold + quantity
            }
        })

        console.log('🎉 Purchase confirmed and recorded!')

        return NextResponse.json({
            success: true,
            orderId: order.id,
            transactionSignature,
            tickets: tickets.map(t => ({
                id: t.id,
                nftMintAddress: t.nftMintAddress,
                tokenId: t.tokenId
            })),
            message: 'Purchase confirmed successfully!'
        })
    } catch (error) {
        console.error('Error confirming purchase:', error)
        return NextResponse.json(
            { error: `Failed to confirm purchase: ${(error as Error).message}` },
            { status: 500 }
        )
    }
}

