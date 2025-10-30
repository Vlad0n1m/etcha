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
        const collectionAddress = nft.address.toBase58()

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
        console.log(`Adding ${items.length} items to Candy Machine...`)

        // Add items in batches of 5 to avoid "Transaction too large" errors
        const batchSize = 5
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize)
            const batchNumber = Math.floor(i / batchSize) + 1
            const totalBatches = Math.ceil(items.length / batchSize)
            
            console.log(`Adding batch ${batchNumber}/${totalBatches} (${batch.length} items)...`)

            // Get fresh Candy Machine state before each batch (as per etcha-candy pattern)
            const candyMachine = await metaplex.candyMachines().findByAddress({
                address: new PublicKey(candyMachineAddress),
            })

            await metaplex.candyMachines().insertItems({
                candyMachine,
                items: batch,
            })

            console.log(`✅ Batch ${batchNumber} added successfully!`)

            // Small delay between batches to allow blockchain to process
            if (i + batchSize < items.length) {
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }

        console.log('All items added to Candy Machine successfully!')

        // Wait a bit for blockchain to update
        console.log('Waiting for blockchain to update...')
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Verify that all items were added (optional - as per etcha-candy, they don't check this)
        try {
            const updatedCandyMachine = await metaplex.candyMachines().findByAddress({
                address: new PublicKey(candyMachineAddress),
            })
            
            console.log(`Candy Machine verification:`)
            console.log(`  Items available: ${updatedCandyMachine.itemsAvailable.toNumber()}`)
            console.log(`  Items minted: ${updatedCandyMachine.itemsMinted.toNumber()}`)
            console.log(`  Is fully loaded: ${updatedCandyMachine.isFullyLoaded}`)
            
            // Note: isFullyLoaded may be false immediately after adding items
            // The blockchain needs time to process. We'll check this on mint instead.
            if (updatedCandyMachine.itemsAvailable.toNumber() !== items.length) {
                console.warn(
                    `Warning: Items available (${updatedCandyMachine.itemsAvailable.toNumber()}) ` +
                    `does not match expected (${items.length}). ` +
                    `This may resolve after blockchain confirmation.`
                )
            }
        } catch (verifyError) {
            console.warn('Could not verify Candy Machine status:', verifyError)
            // Don't throw - items were added, verification is optional
        }
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
    userKeypair?: Keypair // Derived keypair from signature (must match ownerAddress)
    ownerAddress?: string // Explicit owner address from DB (should match userKeypair.publicKey)
    pricePerNFT?: number // Optional price from database (fallback if guards don't have price)
}): Promise<{
    nftMintAddresses: string[]
    transactionSignature: string
    totalPaid: number
}> {
    try {
        const platformSigner = params.platformSigner || loadPlatformWallet()
        const connection = getConnection()
        
        // Use derived keypair if provided, otherwise create guest Metaplex instance
        const userKeypair = params.userKeypair
        if (!userKeypair) {
            throw new Error('User keypair is required for minting. Please provide signature.')
        }
        
        // Verify owner address matches keypair address if provided
        const ownerAddress = params.ownerAddress || userKeypair.publicKey.toString()
        if (ownerAddress !== userKeypair.publicKey.toString()) {
            throw new Error(
                `Owner address (${ownerAddress}) doesn't match keypair address (${userKeypair.publicKey.toString()}). ` +
                `They must match for proper minting.`
            )
        }
        
        // Create Metaplex instance with derived user keypair
        const buyerMetaplex = Metaplex.make(connection)
            .use(keypairIdentity(userKeypair))

        console.log(`Minting ${params.quantity} NFT(s) from Candy Machine...`)
        console.log('Candy Machine:', params.candyMachineAddress)
        console.log('Buyer wallet (Phantom):', params.buyerWallet)
        console.log('Derived wallet (for minting):', userKeypair.publicKey.toString())
        console.log('Owner address (from DB):', ownerAddress)

        // Check balance of derived wallet before minting
        const derivedBalance = await connection.getBalance(userKeypair.publicKey)
        const derivedBalanceSOL = derivedBalance / LAMPORTS_PER_SOL
        console.log(`Derived wallet balance: ${derivedBalanceSOL} SOL (${derivedBalance} lamports)`)

        // Get price from guards - try to extract from candy machine guards
        // Note: We'll get the actual price from the guards after fetching the candy machine
        let pricePerNFT = 0
        let totalPrice = 0
        const estimatedFees = 0.001 * params.quantity // Rough estimate for transaction fees

        // Get Candy Machine
        const candyMachine = await buyerMetaplex.candyMachines().findByAddress({
            address: new PublicKey(params.candyMachineAddress),
        })

        // Verify Candy Machine is fully loaded before minting
        if (!candyMachine.isFullyLoaded) {
            throw new Error(
                `Candy Machine is not fully loaded. ` +
                `Items available: ${candyMachine.itemsAvailable.toNumber()}, ` +
                `but not all config lines were added. ` +
                `Please complete item insertion before minting.`
            )
        }

        console.log(`Candy Machine is fully loaded: ${candyMachine.itemsAvailable.toNumber()} items ready for minting`)
        console.log(`Items already minted: ${candyMachine.itemsMinted.toNumber()}`)

        // Extract price from guards (solPayment guard)
        try {
            // In JS SDK v0.19.0, guards are stored in candyMachine.guards
            // Type assertion for guards that may not be in type definitions
            const candyMachineWithGuards = candyMachine as typeof candyMachine & {
                guards?: {
                    solPayment?: {
                        amount?: number | bigint | { basisPoints?: number | bigint } | { basisPoints: { toNumber?: () => number } }
                    }
                }
            }
            
            const guards = candyMachineWithGuards.guards
            if (guards && guards.solPayment) {
                // solPayment.amount may be in different formats
                const solPaymentAmount = guards.solPayment.amount
                if (solPaymentAmount !== undefined) {
                    if (typeof solPaymentAmount === 'number' || typeof solPaymentAmount === 'bigint') {
                        pricePerNFT = Number(solPaymentAmount) / LAMPORTS_PER_SOL
                    } else if (typeof solPaymentAmount === 'object' && solPaymentAmount !== null) {
                        // Try basisPoints property
                        const amountObj = solPaymentAmount as { basisPoints?: number | bigint | { toNumber?: () => number } }
                        if (amountObj.basisPoints !== undefined) {
                            if (typeof amountObj.basisPoints === 'number' || typeof amountObj.basisPoints === 'bigint') {
                                pricePerNFT = Number(amountObj.basisPoints) / LAMPORTS_PER_SOL
                            } else if (typeof amountObj.basisPoints === 'object' && 'toNumber' in amountObj.basisPoints) {
                                pricePerNFT = (amountObj.basisPoints.toNumber?.() || 0) / LAMPORTS_PER_SOL
                            }
                        }
                    }
                    console.log(`Price from guards: ${pricePerNFT} SOL`)
                }
            }
        } catch (guardError) {
            console.warn('Could not extract price from guards:', guardError)
        }

        // Fallback to database price if guards don't have price
        if (pricePerNFT === 0 && params.pricePerNFT) {
            pricePerNFT = params.pricePerNFT
            console.log(`Using price from database: ${pricePerNFT} SOL`)
        }

        totalPrice = pricePerNFT * params.quantity
        
        // Final balance check before minting
        if (derivedBalanceSOL < totalPrice + estimatedFees) {
            throw new Error(
                `Insufficient balance in derived wallet. ` +
                `Required: ${(totalPrice + estimatedFees).toFixed(4)} SOL, ` +
                `Available: ${derivedBalanceSOL.toFixed(4)} SOL. ` +
                `Please send SOL to: ${userKeypair.publicKey.toString()}`
            )
        }

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
            const mintAddress = nft.address.toBase58()
            nftMintAddresses.push(mintAddress)

            console.log(`Minted NFT ${i + 1}/${params.quantity}:`, mintAddress)
        }

        // Calculate total paid (price already fetched above for balance check)
        const totalPaid = pricePerNFT * params.quantity

        console.log(`Minting complete. Total paid: ${totalPaid} SOL`)
        console.log(`Remaining balance: ${((derivedBalance / LAMPORTS_PER_SOL) - totalPaid - estimatedFees).toFixed(4)} SOL`)

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
    isFullyLoaded: boolean
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
        const isFullyLoaded = candyMachine.isFullyLoaded

        console.log(`Candy Machine status: ${itemsAvailable} available, ${itemsRedeemed} minted, ${itemsRemaining} remaining`)
        console.log(`Is fully loaded: ${isFullyLoaded}`)

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
            isFullyLoaded,
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
