import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'

const prisma = new PrismaClient()

// Use devnet for now (should match WalletProvider)
const network = WalletAdapterNetwork.Devnet
const connection = new Connection(clusterApiUrl(network), 'confirmed')

/**
 * POST /api/wallet/balance
 * Get the internal wallet balance for a user
 * Body: { walletAddress: string, signature: string (hex) }
 * Internal wallet is always derived from signature, not stored in DB
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { walletAddress, signature } = body

        if (!walletAddress || !signature) {
            return NextResponse.json(
                { success: false, message: 'walletAddress and signature are required' },
                { status: 400 }
            )
        }

        // Always derive internal wallet from signature (never use DB)
        const { deriveKeypairFromSignature, getDerivationSalt } = await import('@/lib/utils/keyDerivation.server')
        const salt = getDerivationSalt()
        const userKeypair = deriveKeypairFromSignature(signature, walletAddress, salt)
        const internalWalletAddress = userKeypair.publicKey.toString()

        // Get balance of internal wallet
        try {
            const publicKey = new PublicKey(internalWalletAddress)
            const balance = await connection.getBalance(publicKey)
            const balanceSOL = balance / LAMPORTS_PER_SOL

            return NextResponse.json({
                success: true,
                balance: balanceSOL,
                internalWalletAddress: internalWalletAddress,
            })
        } catch (error: any) {
            console.error('Error getting balance:', error)
            return NextResponse.json({
                success: true,
                balance: 0,
                internalWalletAddress: internalWalletAddress,
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

