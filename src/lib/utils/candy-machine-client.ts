/**
 * Client-Side Candy Machine Utilities
 * NOTE: All Metaplex operations are done via API routes to avoid bundling Node.js modules
 */

import type { WalletContextState } from '@solana/wallet-adapter-react'

/**
 * Mint NFT from Candy Machine using API route
 * This avoids bundling Metaplex on the client
 */
import { Connection } from '@solana/web3.js'

/**
 * Mint NFT from Candy Machine using API route
 * This avoids bundling Metaplex on the client
 */
export async function mintFromCandyMachine(
    eventId: string,
    candyMachineAddress: string,
    wallet: WalletContextState,
    connection: Connection,
    quantity: number = 1
): Promise<{
    nftMintAddresses: string[]
    signature: string
}> {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.sendTransaction) {
        throw new Error('Wallet not connected or does not support signing')
    }

    try {
        console.log('Minting via API route...')

        // Step 1: Get Mint Transaction
        const mintResponse = await fetch('/api/mint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventId,
                candyMachineAddress,
                buyerWallet: wallet.publicKey.toString(),
                quantity,
            }),
        })

        const mintResult = await mintResponse.json()

        if (!mintResult.success) {
            throw new Error(mintResult.message || 'Failed to prepare mint transaction')
        }

        const transactionBase64 = mintResult.transaction
        const mintAddresses = mintResult.mintAddresses || []

        if (!transactionBase64) {
            throw new Error('No transaction returned from server')
        }

        // Step 2: Deserialize and Sign Transaction
        const { Transaction } = await import('@solana/web3.js')
        const transaction = Transaction.from(Buffer.from(transactionBase64, 'base64'))

        // Sign and Send
        // Note: wallet.sendTransaction handles signing and sending
        // We need the connection from somewhere. Since this is a utility, 
        // we might need to pass connection or assume wallet adapter has it (it usually does in context but not on the adapter object directly in all types).
        // However, WalletContextState usually has `connection` if used from `useConnection` hook, but here we only pass `wallet`.
        // Let's assume the caller should pass connection or we use a default one?
        // Actually, `wallet.sendTransaction` requires `connection`.
        // I should update the signature to accept `connection`.

        // Sign and Send
        const signature = await wallet.sendTransaction(transaction, connection)

        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed')

        // Step 3: Confirm Mint with Backend
        const confirmResponse = await fetch("/api/mint/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                eventId,
                candyMachineAddress,
                buyerWallet: wallet.publicKey.toString(),
                quantity,
                nftMintAddresses: mintAddresses,
                transactionSignature: signature,
            }),
        })

        const confirmResult = await confirmResponse.json()

        if (!confirmResult.success) {
            throw new Error(confirmResult.message || "Failed to save ticket information")
        }

        return {
            nftMintAddresses: mintAddresses,
            signature: signature,
        }

    } catch (error) {
        console.error('Error minting from Candy Machine:', error)
        throw error
    }
}

/**
 * Get Candy Machine price via API route
 */
export async function getCandyMachinePrice(
    candyMachineAddress: string
): Promise<number> {
    try {
        const response = await fetch(`/api/candy-machine/${candyMachineAddress}`)
        const result = await response.json()

        if (result.success && result.price) {
            return result.price
        }
        return 0
    } catch (error) {
        console.error('Error getting Candy Machine price:', error)
        return 0
    }
}

/**
 * Get Candy Machine availability via API route
 */
export async function getCandyMachineAvailability(
    candyMachineAddress: string
): Promise<{
    itemsAvailable: number
    itemsRedeemed: number
    itemsRemaining: number
}> {
    try {
        const response = await fetch(`/api/candy-machine/${candyMachineAddress}`)
        const result = await response.json()

        if (result.success) {
            return {
                itemsAvailable: result.itemsAvailable || 0,
                itemsRedeemed: result.itemsRedeemed || 0,
                itemsRemaining: result.itemsRemaining || 0,
            }
        }
        return {
            itemsAvailable: 0,
            itemsRedeemed: 0,
            itemsRemaining: 0,
        }
    } catch (error) {
        console.error('Error getting Candy Machine availability:', error)
        throw error
    }
}
