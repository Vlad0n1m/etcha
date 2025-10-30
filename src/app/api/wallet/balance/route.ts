import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'

const prisma = new PrismaClient()

// Use devnet for now (should match WalletProvider)
const network = WalletAdapterNetwork.Devnet
const connection = new Connection(clusterApiUrl(network), 'confirmed')

/**
 * GET /api/wallet/balance?walletAddress=<external_wallet>
 * Get the internal wallet balance for a user
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

        // Find user by external wallet address
        const user = await prisma.user.findUnique({
            where: {
                walletAddress: walletAddress,
            },
            select: {
                internalWalletAddress: true,
            },
        })

        if (!user || !user.internalWalletAddress) {
            return NextResponse.json({
                success: true,
                balance: 0,
                internalWalletAddress: null,
            })
        }

        // Get balance of internal wallet
        try {
            const publicKey = new PublicKey(user.internalWalletAddress)
            const balance = await connection.getBalance(publicKey)
            const balanceSOL = balance / LAMPORTS_PER_SOL

            return NextResponse.json({
                success: true,
                balance: balanceSOL,
                internalWalletAddress: user.internalWalletAddress,
            })
        } catch (error: any) {
            console.error('Error getting balance:', error)
            return NextResponse.json({
                success: true,
                balance: 0,
                internalWalletAddress: user.internalWalletAddress,
            })
        }
    } catch (error: any) {
        console.error('Error in balance API:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to get wallet balance',
                error: error.message || String(error),
            },
            { status: 500 }
        )
    }
}

