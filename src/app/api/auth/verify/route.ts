import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { verifyWalletSignature } from '@/lib/blockchain/wallet-verifier'

const verifySchema = z.object({
    walletAddress: z.string().min(1),
    signature: z.union([
        z.string().min(1),
        z.object({
            r: z.string().optional(),
            s: z.string().optional(),
            v: z.number().optional()
        })
    ]),
    message: z.string().min(1)
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { walletAddress, signature, message } = verifySchema.parse(body)

        // Convert signature to string if it's an object (Uint8Array from wallet)
        let signatureString: string
        if (typeof signature === 'string') {
            signatureString = signature
        } else if (signature && typeof signature === 'object') {
            // Handle Uint8Array or signature object
            if (Array.isArray(signature) || signature instanceof Uint8Array) {
                // Convert Uint8Array to base64 string
                signatureString = Buffer.from(signature).toString('base64')
            } else {
                // Handle signature object with r, s, v properties
                signatureString = JSON.stringify(signature)
            }
        } else {
            throw new Error('Invalid signature format')
        }

        // Verify the signature
        const isValidSignature = verifyWalletSignature(message, signatureString, walletAddress)

        if (!isValidSignature) {
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 401 }
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

        // Create JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                walletAddress: user.walletAddress
            },
            process.env.JWT_SECRET!,
            { expiresIn: '7d' }
        )

        return NextResponse.json({
            token,
            user: {
                id: user.id,
                walletAddress: user.walletAddress
            }
        })
    } catch (error) {
        console.error('Error verifying signature:', error)
        return NextResponse.json(
            { error: 'Verification failed' },
            { status: 500 }
        )
    }
}
