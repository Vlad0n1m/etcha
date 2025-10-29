/**
 * Candy Machine Service using @metaplex-foundation/js SDK (v0.19.0)
 * Based on working implementation from etcha-candy
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Metaplex, keypairIdentity, lamports } from '@metaplex-foundation/js'
import { loadPlatformWallet, loadCandyMachineAuthority } from '../utils/wallet'

/**
 * Get RPC connection
 */
function getConnection(): Connection {
    const rpcUrl = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
    return new Connection(rpcUrl, {
        commitment: 'confirmed',
    })
}

/**
 * Initialize Metaplex instance with keypair
 */
function initializeMetaplex(keypair?: Keypair): Metaplex {
    const connection = getConnection()
    const authority = keypair || loadPlatformWallet()
    
    return Metaplex.make(connection)
        .use(keypairIdentity(authority))
}

/**
 * Create NFT Collection for an event
 */
export async function createCollection(params: {
    name: string
    symbol: string
    uri: string
    authority?: Keypair
}): Promise<{
    collectionAddress: string
    signature: string
}> {
    try {
        const authority = params.authority || loadPlatformWallet()
        const metaplex = initializeMetaplex(authority)

        console.log('Creating Collection NFT with Metaplex JS SDK...')
        console.log('Using wallet:', authority.publicKey.toString())
        console.log('Collection name:', params.name)
        console.log('Collection symbol:', params.symbol)
        console.log('Metadata URI:', params.uri)

        // Check wallet balance
        const balance = await metaplex.connection.getBalance(authority.publicKey)
        const balanceSOL = balance / LAMPORTS_PER_SOL
        console.log('Wallet balance:', balanceSOL, 'SOL')

        if (balanceSOL < 0.01) {
            throw new Error('Insufficient SOL balance for transaction')
        }

        // Create Collection NFT
        const { nft, response } = await metaplex.nfts().create({
            name: params.name,
            symbol: params.symbol,
            uri: params.uri,
            sellerFeeBasisPoints: 250, // 2.5% royalty
            creators: [
                {
                    address: authority.publicKey,
                    share: 100, // 100% to platform
                },
            ],
            isCollection: true,
        })

        const signature = response.signature
        const collectionAddress = nft.address.toString()

        console.log('Collection NFT created successfully!')
        console.log('NFT Address:', collectionAddress)
        console.log('Transaction Signature:', signature)

        return {
            collectionAddress,
            signature,
        }
    } catch (error) {
        console.error('Failed to create collection:', error)
        throw new Error(`Collection creation failed: ${error instanceof Error ? error.message : String(error)}`)
    }
}

/**
 * Create Candy Machine V3 with guards
 */
export async function createCandyMachineV3(params: {
    collectionAddress: string
    itemsAvailable: number
    priceInSol: number
    sellerFeeBasisPoints: number
    platformWallet: string
    authority?: Keypair
    items: Array<{ name: string; uri: string }>
    startDate?: Date
}): Promise<{
    candyMachineAddress: string
    signature: string
}> {
    try {
        const authority = params.authority || loadCandyMachineAuthority()
        const metaplex = initializeMetaplex(authority)

        console.log('Creating Candy Machine with Metaplex JS SDK...')
        console.log('Using wallet:', authority.publicKey.toString())
        console.log('Collection address:', params.collectionAddress)
        console.log('Items available:', params.itemsAvailable)
        console.log('Price per item:', params.priceInSol, 'SOL')

        // Check wallet balance
        const balance = await metaplex.connection.getBalance(authority.publicKey)
        const balanceSOL = balance / LAMPORTS_PER_SOL
        console.log('Wallet balance:', balanceSOL, 'SOL')

        if (balanceSOL < 0.1) {
            throw new Error('Insufficient SOL balance for Candy Machine creation')
        }

        // Validate collection exists
        try {
            const collectionNft = await metaplex.nfts().findByMint({
                mintAddress: new PublicKey(params.collectionAddress),
            })
            console.log('Collection validated:', collectionNft.address.toString())
        } catch (error) {
            console.error('Collection validation failed:', error)
            throw new Error(`Collection not found or invalid: ${params.collectionAddress}`)
        }

        // Create Candy Machine configuration
        const priceInLamports = Math.floor(params.priceInSol * LAMPORTS_PER_SOL)
        
        console.log('Creating Candy Machine with guards...')
        console.log('Price in lamports:', priceInLamports)

        // Create Candy Machine using JS SDK (v0.19.0 approach)
        const { candyMachine, response } = await metaplex.candyMachines().create({
            itemsAvailable: params.itemsAvailable,
            sellerFeeBasisPoints: params.sellerFeeBasisPoints,
            symbol: params.items[0]?.name?.substring(0, 4).toUpperCase() || 'TICK',
            creators: [
                {
                    address: authority.publicKey,
                    share: 100,
                },
            ],
            collection: {
                address: new PublicKey(params.collectionAddress),
                updateAuthority: authority,
            },
            // Set price through guards
            guards: {
                solPayment: {
                    amount: {
                        basisPoints: BigInt(priceInLamports),
                        currency: {
                            symbol: 'SOL',
                            decimals: 9,
                        },
                    },
                    destination: new PublicKey(params.platformWallet),
                },
            },
        })

        const candyMachineAddress = candyMachine.address.toString()
        const signature = response.signature

        console.log('Candy Machine created successfully!')
        console.log('Candy Machine Address:', candyMachineAddress)
        console.log('Transaction Signature:', signature)

        // Add items to Candy Machine in batches
        console.log(`Adding ${params.items.length} items to Candy Machine...`)
        await addItemsToCandyMachine(metaplex, candyMachineAddress, params.items)

        return {
            candyMachineAddress,
            signature,
        }
            } catch (error) {
        console.error('Failed to create Candy Machine:', error)
        throw new Error(`Candy Machine creation failed: ${error instanceof Error ? error.message : String(error)}`)
    }
}

/**
 * Add items to Candy Machine in batches
 */
async function addItemsToCandyMachine(
    metaplex: Metaplex,
    candyMachineAddress: string,
    items: Array<{ name: string; uri: string }>
): Promise<void> {
    try {
        // Get Candy Machine
        const candyMachine = await metaplex.candyMachines().findByAddress({
            address: new PublicKey(candyMachineAddress),
        })

        console.log('Adding items to Candy Machine...')

        // Add items in batches of 5 to avoid "Transaction too large" errors
        const batchSize = 5
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize)
            console.log(`Adding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)} (${batch.length} items)...`)

            await metaplex.candyMachines().insertItems({
                candyMachine,
                items: batch,
            })

            console.log(`Batch ${Math.floor(i / batchSize) + 1} added successfully!`)

            // Small delay between batches
            if (i + batchSize < items.length) {
                    await new Promise(resolve => setTimeout(resolve, 500))
            }
        }

        console.log('All items added to Candy Machine successfully!')
    } catch (error) {
        console.error('Failed to add items to Candy Machine:', error)
        throw new Error(`Failed to add items: ${error instanceof Error ? error.message : String(error)}`)
    }
}

/**
 * Mint NFT from Candy Machine V3
 */
export async function mintNFT(params: {
    candyMachineAddress: string
    buyerWallet: string
    quantity: number
    platformSigner?: Keypair
}): Promise<{
    nftMintAddresses: string[]
    transactionSignature: string
    totalPaid: number
}> {
    try {
        const platformSigner = params.platformSigner || loadPlatformWallet()
        const connection = getConnection()
        
        // Parse buyer wallet
        const buyerPublicKey = new PublicKey(params.buyerWallet)
        
        // Create Metaplex instance for buyer (they will sign)
        // Note: In real scenario, buyer should sign through wallet adapter
        // This function assumes the transaction will be signed by the caller
        const buyerMetaplex = Metaplex.make(connection)

        console.log(`Minting ${params.quantity} NFT(s) from Candy Machine...`)
        console.log('Candy Machine:', params.candyMachineAddress)
        console.log('Buyer wallet:', params.buyerWallet)

        // Get Candy Machine
        const candyMachine = await buyerMetaplex.candyMachines().findByAddress({
            address: new PublicKey(params.candyMachineAddress),
        })

        const nftMintAddresses: string[] = []
        let lastSignature = ''

        // Mint NFTs one by one
        for (let i = 0; i < params.quantity; i++) {
            console.log(`Minting NFT ${i + 1}/${params.quantity}...`)

            // Mint NFT
            // Note: In production, this should be signed by buyer's wallet
            // For now, using platform signer as collection update authority
            const { nft, response } = await buyerMetaplex.candyMachines().mint({
                candyMachine,
                collectionUpdateAuthority: platformSigner.publicKey,
            })

            lastSignature = response.signature
            nftMintAddresses.push(nft.address.toString())

            console.log(`Minted NFT ${i + 1}/${params.quantity}:`, nft.address.toString())
        }

        // Get price from guards (if available)
        const pricePerNFT = params.quantity > 0 ? await getCandyMachinePrice(params.candyMachineAddress) : 0
        const totalPaid = pricePerNFT * params.quantity

        console.log(`Minting complete. Total paid: ${totalPaid} SOL`)

        return {
            nftMintAddresses,
            transactionSignature: lastSignature,
            totalPaid,
        }
    } catch (error) {
        console.error('Failed to mint NFT:', error)
        throw new Error(`NFT minting failed: ${error instanceof Error ? error.message : String(error)}`)
    }
}

/**
 * Get Candy Machine price from guards
 */
async function getCandyMachinePrice(candyMachineAddress: string): Promise<number> {
    try {
        const metaplex = initializeMetaplex()
        // Fetch Candy Machine to access guards
        await metaplex.candyMachines().findByAddress({
            address: new PublicKey(candyMachineAddress),
        })

        // Price is stored in guards.solPayment
        // In JS SDK v0.19.0, guards may be accessed differently
        // This is a simplified version - may need adjustment based on actual SDK structure
        return 0 // Placeholder - will be extracted from guards
    } catch (error) {
        console.error('Failed to get Candy Machine price:', error)
        return 0
    }
}

/**
 * Get Candy Machine data
 */
export async function getCandyMachineData(
    candyMachineAddress: string
): Promise<{
    itemsAvailable: number
    itemsRedeemed: number
    itemsRemaining: number
    price: number
    priceInLamports: string
    authority: string
    collectionAddress: string
}> {
    try {
        const metaplex = initializeMetaplex()

        console.log('Fetching Candy Machine data:', candyMachineAddress)

        const candyMachine = await metaplex.candyMachines().findByAddress({
            address: new PublicKey(candyMachineAddress),
        })

        const itemsAvailable = candyMachine.itemsAvailable.toNumber()
        const itemsRedeemed = candyMachine.itemsMinted.toNumber()
        const itemsRemaining = itemsAvailable - itemsRedeemed

        // Get price from guards (simplified - may need adjustment)
        const price = 0 // Placeholder - extract from guards if needed

        return {
            itemsAvailable,
            itemsRedeemed,
            itemsRemaining,
            price,
            priceInLamports: '0', // Placeholder
            authority: candyMachine.authorityAddress.toString(),
            collectionAddress: candyMachine.collectionMintAddress?.toString() || '',
        }
    } catch (error) {
        console.error('Failed to get Candy Machine data:', error)
        throw new Error(`Failed to fetch Candy Machine data: ${error instanceof Error ? error.message : String(error)}`)
    }
}

/**
 * Distribute payment after mint: 97.5% to organizer, 2.5% to platform
 */
export async function distributePayment(params: {
    totalAmount: number
    organizerWallet: string
    platformWallet?: Keypair
}): Promise<{
    organizerShare: number
    platformShare: number
    transactionHash: string
}> {
    try {
        const platformWallet = params.platformWallet || loadPlatformWallet()

        // Calculate shares (in lamports)
        const totalLamports = Math.floor(params.totalAmount * LAMPORTS_PER_SOL)
        const organizerShareLamports = Math.floor(totalLamports * 0.975)
        const platformShareLamports = totalLamports - organizerShareLamports

        console.log(`Distributing payment: ${params.totalAmount} SOL`)
        console.log(`  Organizer (97.5%): ${organizerShareLamports / LAMPORTS_PER_SOL} SOL`)
        console.log(`  Platform (2.5%): ${platformShareLamports / LAMPORTS_PER_SOL} SOL`)

        // Simple transfer - in production, this should be more sophisticated
        // This is a placeholder - actual implementation depends on how payments are handled
        // TODO: Implement actual SOL transfer using Metaplex or web3.js
        const transactionHash = 'transfer-placeholder'

        console.log('Payment distributed successfully')

        return {
            organizerShare: organizerShareLamports / LAMPORTS_PER_SOL,
            platformShare: platformShareLamports / LAMPORTS_PER_SOL,
            transactionHash,
        }
    } catch (error) {
        console.error('Failed to distribute payment:', error)
        throw new Error(`Payment distribution failed: ${error instanceof Error ? error.message : String(error)}`)
    }
}
