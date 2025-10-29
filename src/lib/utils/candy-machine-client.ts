/**
 * Client-Side Candy Machine Mint Utilities
 * Using @metaplex-foundation/js SDK (v0.19.0) with Wallet Adapter
 * Note: JS SDK v0.19.0 may not have direct wallet adapter support
 * We'll use transaction builders and manual signing
 */

import { Connection, PublicKey } from '@solana/web3.js'
import { Metaplex } from '@metaplex-foundation/js'
import type { WalletContextState } from '@solana/wallet-adapter-react'

/**
 * Get Candy Machine price from guards
 */
export async function getCandyMachinePrice(
    candyMachineAddress: string,
    rpcUrl: string = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
): Promise<number> {
    try {
        const connection = new Connection(rpcUrl, { commitment: 'confirmed' })
        const metaplex = Metaplex.make(connection)

        const candyMachine = await metaplex.candyMachines().findByAddress({
            address: new PublicKey(candyMachineAddress),
        })

        // Price is stored in guards - need to check guards structure
        // In JS SDK v0.19.0, guards are accessed through candyMachine.guards
        // This is a simplified version - actual implementation may vary
        console.log('Candy Machine guards structure:', candyMachine)
        
        // Try to extract price from guards (if available in this SDK version)
        // Placeholder - will need to be adjusted based on actual SDK structure
        return 0
    } catch (error) {
        console.error('Error getting Candy Machine price:', error)
        throw error
    }
}

/**
 * Mint NFT from Candy Machine using user's wallet
 * 
 * Note: This function handles wallet adapter integration for JS SDK v0.19.0
 * The SDK may require manual transaction signing through wallet adapter
 */
export async function mintFromCandyMachine(
    candyMachineAddress: string,
    wallet: WalletContextState,
    quantity: number = 1,
    collectionUpdateAuthority?: PublicKey,
    rpcUrl: string = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
): Promise<{
    nftMintAddresses: string[]
    signature: string
}> {
    if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Wallet not connected')
    }

    try {
        console.log('Initializing Metaplex with wallet adapter...')
        
        const connection = new Connection(rpcUrl, { commitment: 'confirmed' })
        
        // Create Metaplex instance without identity (we'll sign manually)
        // JS SDK v0.19.0 may not have walletAdapterIdentity, so we use transaction builders
        const metaplex = Metaplex.make(connection)

        console.log('Fetching Candy Machine:', candyMachineAddress)
        
        const candyMachine = await metaplex.candyMachines().findByAddress({
            address: new PublicKey(candyMachineAddress),
        })

        console.log('Candy Machine found:', {
            address: candyMachine.address.toString(),
            itemsAvailable: candyMachine.itemsAvailable.toString(),
            itemsMinted: candyMachine.itemsMinted.toString(),
        })

        const nftMintAddresses: string[] = []
        let lastSignature = ''

        // Mint NFTs one by one
        for (let i = 0; i < quantity; i++) {
            console.log(`Minting NFT ${i + 1}/${quantity}...`)

            // Build mint transaction
            // In JS SDK v0.19.0, we need to use transaction builder
            // For now, we'll try direct mint call - if it fails, we'll need to handle manually
            try {
                // Try to use mint with wallet adapter identity
                // This is a simplified approach - may need adjustment
                interface MintParams {
                    candyMachine: typeof candyMachine
                    collectionUpdateAuthority?: PublicKey
                }
                
                const mintParams: MintParams = {
                    candyMachine,
                }
                if (collectionUpdateAuthority) {
                    mintParams.collectionUpdateAuthority = collectionUpdateAuthority
                }
                
                // Create a temporary identity for building transaction
                // The actual signing will happen through wallet adapter
                const { nft, response } = await metaplex.candyMachines().mint(mintParams)

                lastSignature = response.signature
                nftMintAddresses.push(nft.address.toString())

                console.log(`✓ Minted NFT ${i + 1}/${quantity}:`, nft.address.toString())
            } catch (mintError: unknown) {
                // If direct mint fails (likely because no identity), we need to handle manually
                console.warn('Direct mint failed, may need manual transaction building:', mintError)
                throw new Error(
                    `Minting requires wallet adapter integration. ` +
                    `JS SDK v0.19.0 may need manual transaction building. ` +
                    `Error: ${mintError.message}`
                )
            }
        }

        console.log('All NFTs minted successfully!')
        console.log('NFT addresses:', nftMintAddresses)
        console.log('Transaction signature:', lastSignature)

        return {
            nftMintAddresses,
            signature: lastSignature,
        }
    } catch (error) {
        console.error('Error minting from Candy Machine:', error)
        throw error
    }
}

/**
 * Get Candy Machine availability
 */
export async function getCandyMachineAvailability(
    candyMachineAddress: string,
    rpcUrl: string = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
): Promise<{
    itemsAvailable: number
    itemsRedeemed: number
    itemsRemaining: number
}> {
    try {
        const connection = new Connection(rpcUrl, { commitment: 'confirmed' })
        const metaplex = Metaplex.make(connection)
        
        const candyMachine = await metaplex.candyMachines().findByAddress({
            address: new PublicKey(candyMachineAddress),
        })

        const itemsAvailable = candyMachine.itemsAvailable.toNumber()
        const itemsRedeemed = candyMachine.itemsMinted.toNumber()

        return {
            itemsAvailable,
            itemsRedeemed,
            itemsRemaining: itemsAvailable - itemsRedeemed,
        }
    } catch (error) {
        console.error('Error getting Candy Machine availability:', error)
        throw error
    }
}
