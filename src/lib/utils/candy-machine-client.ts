/**
 * Client-Side Candy Machine Utilities
 * NOTE: All Metaplex operations are done via API routes to avoid bundling Node.js modules
 */

import type { WalletContextState } from '@solana/wallet-adapter-react'

/**
 * Mint NFT from Candy Machine using API route
 * This avoids bundling Metaplex on the client
 */
export async function mintFromCandyMachine(
    candyMachineAddress: string,
    wallet: WalletContextState,
    quantity: number = 1,
    collectionUpdateAuthority?: string
): Promise<{
    nftMintAddresses: string[]
    signature: string
}> {
    if (!wallet.publicKey) {
        throw new Error('Wallet not connected')
    }

    try {
        console.log('Minting via API route to avoid bundling Metaplex on client...')

        // Use API route for minting (server-side handles Metaplex)
        const response = await fetch('/api/mint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                candyMachineAddress,
                buyerWallet: wallet.publicKey.toString(),
                quantity,
                collectionUpdateAuthority,
            }),
        })

        const result = await response.json()

        if (!result.success) {
            throw new Error(result.message || 'Failed to mint NFT')
        }

        return {
            nftMintAddresses: result.nftMintAddresses || [],
            signature: result.transactionSignature || '',
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
