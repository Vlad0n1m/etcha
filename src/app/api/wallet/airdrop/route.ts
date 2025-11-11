import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js'

export async function POST(request: NextRequest) {
    try {
        const { recipientAddress } = await request.json()

        // Validate recipient address
        if (!recipientAddress) {
            return NextResponse.json(
                { success: false, error: 'Recipient address is required' },
                { status: 400 }
            )
        }

        try {
            new PublicKey(recipientAddress)
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid recipient address' },
                { status: 400 }
            )
        }

        // Get platform wallet private key from environment
        const platformPrivateKeyEnv = process.env.PLATFORM_WALLET_PRIVATE_KEY
        if (!platformPrivateKeyEnv) {
            console.error('PLATFORM_WALLET_PRIVATE_KEY not configured')
            return NextResponse.json(
                { success: false, error: 'Platform wallet not configured' },
                { status: 500 }
            )
        }

        // Parse platform wallet keypair
        let platformKeypair: Keypair
        try {
            const privateKeyArray = JSON.parse(platformPrivateKeyEnv)
            platformKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray))
        } catch (error) {
            console.error('Failed to parse PLATFORM_WALLET_PRIVATE_KEY:', error)
            return NextResponse.json(
                { success: false, error: 'Invalid platform wallet configuration' },
                { status: 500 }
            )
        }

        // Create connection
        const rpcUrl = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
        const connection = new Connection(rpcUrl, 'confirmed')

        // Create airdrop transaction (1 SOL)
        const airdropTransaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: platformKeypair.publicKey,
                toPubkey: new PublicKey(recipientAddress),
                lamports: Math.floor(1 * LAMPORTS_PER_SOL),
            })
        )

        // Get latest blockhash
        const { blockhash } = await connection.getLatestBlockhash('confirmed')
        airdropTransaction.recentBlockhash = blockhash
        airdropTransaction.feePayer = platformKeypair.publicKey

        // Sign transaction with platform wallet
        airdropTransaction.sign(platformKeypair)

        // Send transaction
        const signature = await connection.sendRawTransaction(airdropTransaction.serialize(), {
            skipPreflight: false,
        })

        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed')

        console.log('Airdrop successful. Signature:', signature)

        return NextResponse.json({
            success: true,
            transactionSignature: signature,
            amount: 1,
        })
    } catch (error: unknown) {
        console.error('Airdrop error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to process airdrop'
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        )
    }
}
