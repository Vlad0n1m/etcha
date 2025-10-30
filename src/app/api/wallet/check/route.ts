import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { PublicKey } from '@solana/web3.js'

const prisma = new PrismaClient()

/**
 * GET /api/wallet/check?walletAddress=<external_wallet>
 * Check if user exists and has internal wallet
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const walletAddress = searchParams.get('walletAddress')

        if (!walletAddress) {
            return NextResponse.json(
                { success: false, message: 'walletAddress is required' },
                { status: 400 }
            )
        }

        // Validate public key format
        try {
            new PublicKey(walletAddress)
        } catch {
            return NextResponse.json(
                { success: false, message: 'Invalid walletAddress format' },
                { status: 400 }
            )
        }

        // Find user by external wallet address
        const user = await prisma.user.findUnique({
            where: {
                walletAddress: walletAddress,
            },
            select: {
                id: true,
                internalWalletAddress: true,
            },
        })

        return NextResponse.json({
            success: true,
            exists: !!user,
            hasInternalWallet: !!user?.internalWalletAddress,
        })
    } catch (error: any) {
        console.error('Error checking wallet:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to check wallet',
                error: error.message || String(error),
            },
            { status: 500 }
        )
    }
}

