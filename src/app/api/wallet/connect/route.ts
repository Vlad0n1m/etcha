import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { deriveKeypairFromSignature, getDerivationSalt } from '@/lib/utils/keyDerivation.server'
import { PublicKey } from '@solana/web3.js'

const prisma = new PrismaClient()

/**
 * POST /api/wallet/connect
 * Connect external wallet and create/update user with internal wallet
 * 
 * Body: { 
 *   userPublicKey: string (external wallet address),
 *   signature: string (hex signature from user)
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { userPublicKey, signature } = body

        if (!userPublicKey || !signature) {
            return NextResponse.json(
                { success: false, message: 'userPublicKey and signature are required' },
                { status: 400 }
            )
        }

        // Validate public key format
        let externalPublicKey: PublicKey
        try {
            externalPublicKey = new PublicKey(userPublicKey)
        } catch {
            return NextResponse.json(
                { success: false, message: 'Invalid userPublicKey format' },
                { status: 400 }
            )
        }

        // Get salt (SECRET - stays on server only)
        const salt = getDerivationSalt()
        
        // Derive internal keypair from signature + salt
        const internalKeypair = deriveKeypairFromSignature(signature, userPublicKey, salt)
        const internalWalletAddress = internalKeypair.publicKey.toString()

        // Find or create user with external wallet
        const user = await prisma.user.upsert({
            where: {
                walletAddress: externalPublicKey.toString(),
            },
            update: {
                internalWalletAddress: internalWalletAddress,
                updatedAt: new Date(),
            },
            create: {
                walletAddress: externalPublicKey.toString(),
                internalWalletAddress: internalWalletAddress,
            },
        })

        // Create profile if it doesn't exist
        await prisma.profile.upsert({
            where: {
                userId: user.id,
            },
            update: {},
            create: {
                userId: user.id,
            },
        })

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                walletAddress: user.walletAddress,
                internalWalletAddress: user.internalWalletAddress,
            },
        })
    } catch (error: any) {
        console.error('Error connecting wallet:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to connect wallet',
                error: error.message || String(error),
            },
            { status: 500 }
        )
    }
}

