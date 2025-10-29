/**
 * Client-Side Candy Machine V3 Mint Utilities
 * Using Wallet Adapter for browser-based minting
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters'
import { mplCandyMachine } from '@metaplex-foundation/mpl-candy-machine'
import {
    generateSigner,
    publicKey as umiPublicKey,
} from '@metaplex-foundation/umi'
import {
    mintV2,
    fetchCandyMachine,
    fetchCandyGuard,
} from '@metaplex-foundation/mpl-candy-machine'
import type { WalletContextState } from '@solana/wallet-adapter-react'

/**
 * Get Candy Machine price from guards
 */
export async function getCandyMachinePrice(
    candyMachineAddress: string,
    rpcUrl: string = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
): Promise<number> {
    try {
        const umi = createUmi(rpcUrl).use(mplCandyMachine())

        const candyMachine = await fetchCandyMachine(umi, umiPublicKey(candyMachineAddress))

        // Get price from Candy Guard
        try {
            const candyGuard = await fetchCandyGuard(umi, candyMachine.mintAuthority)
            const guardAny = candyGuard as any

            if (guardAny.guards?.solPayment) {
                const solPayment = guardAny.guards.solPayment

                // Try different access patterns
                if (solPayment.__option === 'Some' && solPayment.value?.lamports) {
                    const lamportsValue = solPayment.value.lamports

                    // lamports can be a number or an object with basisPoints
                    if (lamportsValue && typeof lamportsValue === 'object' && lamportsValue.basisPoints) {
                        // New format: { basisPoints: 10000000000n, identifier: 'SOL', decimals: 9 }
                        return Number(lamportsValue.basisPoints) / 1_000_000_000 // Convert to SOL
                    } else {
                        // Old format: direct number
                        return Number(lamportsValue) / 1_000_000_000
                    }
                } else if (solPayment.lamports) {
                    const lamportsValue = solPayment.lamports
                    if (lamportsValue && typeof lamportsValue === 'object' && lamportsValue.basisPoints) {
                        return Number(lamportsValue.basisPoints) / 1_000_000_000
                    } else {
                        return Number(lamportsValue) / 1_000_000_000
                    }
                }
            }
        } catch (guardError) {
            console.error('Error fetching Candy Guard:', guardError)
        }

        return 0
    } catch (error) {
        console.error('Error getting Candy Machine price:', error)
        throw error
    }
}

/**
 * Mint NFT from Candy Machine using user's wallet
 */
export async function mintFromCandyMachine(
    candyMachineAddress: string,
    wallet: WalletContextState,
    quantity: number = 1,
    rpcUrl: string = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
): Promise<{
    nftMintAddresses: string[]
    signature: string
}> {
    if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Wallet not connected')
    }

    try {
        console.log('Initializing UMI with wallet adapter...')
        const umi = createUmi(rpcUrl)
            .use(walletAdapterIdentity(wallet))
            .use(mplCandyMachine())

        console.log('Fetching Candy Machine:', candyMachineAddress)
        const candyMachine = await fetchCandyMachine(umi, umiPublicKey(candyMachineAddress))

        console.log('Candy Machine:', {
            address: candyMachine.publicKey.toString(),
            authority: candyMachine.authority.toString(),
            collectionMint: candyMachine.collectionMint.toString(),
            mintAuthority: candyMachine.mintAuthority.toString(),
        })

        // Fetch Candy Guard
        console.log('Fetching Candy Guard from mintAuthority:', candyMachine.mintAuthority.toString())
        const candyGuard = await fetchCandyGuard(umi, candyMachine.mintAuthority)
        console.log('Candy Guard fetched successfully')

        // Prepare mint args from Candy Guard
        const guardAny = candyGuard as any
        let mintArgs: any = {}

        if (guardAny.guards?.solPayment?.__option === 'Some') {
            // Extract destination for solPayment
            const destination = guardAny.guards.solPayment.value.destination
            console.log('Using solPayment destination:', destination)

            mintArgs = {
                solPayment: {
                    destination,
                },
            }
        }

        console.log('Mint args prepared:', mintArgs)

        const nftMintAddresses: string[] = []
        let lastSignature = ''

        // Mint NFTs one by one
        for (let i = 0; i < quantity; i++) {
            console.log(`Minting NFT ${i + 1}/${quantity}...`)

            const nftMint = generateSigner(umi)

            // CRITICAL: Mint through Candy Guard to enforce guards (like solPayment)
            console.log('Building mint transaction with Candy Guard...')

            const mintTx = mintV2(umi, {
                candyMachine: candyMachine.publicKey,
                nftMint,
                collectionMint: candyMachine.collectionMint,
                collectionUpdateAuthority: candyMachine.authority,
                // IMPORTANT: Specify candyGuard to enforce guards
                candyGuard: candyMachine.mintAuthority,
                // Use default guard group (no group parameter = default)
                group: undefined,
                // CRITICAL: Pass mintArgs to provide guard parameters
                mintArgs,
            })

            console.log('Sending and confirming transaction...')
            const result = await mintTx.sendAndConfirm(umi, {
                confirm: { commitment: 'confirmed' },
            })

            lastSignature = Buffer.from(result.signature).toString('base64')
            nftMintAddresses.push(nftMint.publicKey.toString())

            console.log(`✓ Minted NFT ${i + 1}/${quantity}:`, nftMint.publicKey.toString())
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
        const umi = createUmi(rpcUrl).use(mplCandyMachine())
        const candyMachine = await fetchCandyMachine(umi, umiPublicKey(candyMachineAddress))

        const cmData = candyMachine as any
        const itemsAvailable = Number(cmData.data?.itemsAvailable || 0)
        const itemsRedeemed = Number(candyMachine.itemsRedeemed || 0)

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

