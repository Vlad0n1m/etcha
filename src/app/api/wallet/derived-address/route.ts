import { NextRequest, NextResponse } from 'next/server'
import { deriveKeypairFromSignature, getDerivationSalt } from '@/lib/utils/keyDerivation.server'
import { PublicKey } from '@solana/web3.js'

/**
 * POST /api/wallet/derived-address
 * Get the derived public key for a user based on their signature
 * Salt is kept SECRET on server - only computed address is returned
 * 
 * Body: { userPublicKey: string, signature: string (hex) }
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
        try {
            new PublicKey(userPublicKey)
        } catch {
            return NextResponse.json(
                { success: false, message: 'Invalid userPublicKey format' },
                { status: 400 }
            )
        }

        // Get salt (SECRET - stays on server only)
        const salt = getDerivationSalt()
        
        // Derive keypair on server using signature + salt (salt never exposed)
        const userKeypair = deriveKeypairFromSignature(signature, userPublicKey, salt)
        const derivedPublicKey = userKeypair.publicKey.toString()

        return NextResponse.json({
            success: true,
            derivedPublicKey,
        })
    } catch (error: any) {
        console.error('Error getting derived address:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to get derived address',
                error: error.message || String(error),
            },
            { status: 500 }
        )
    }
}
