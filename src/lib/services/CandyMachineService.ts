/**
 * Candy Machine V3 Service with Real Metaplex Integration
 * Using UMI Framework (@metaplex-foundation/umi)
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys'
import {
    generateSigner,
    percentAmount,
    publicKey as umiPublicKey,
    sol,
    some,
    dateTime,
    Umi,
    createSignerFromKeypair,
    signerIdentity,
} from '@metaplex-foundation/umi'
import {
    create as createCandyMachine,
    createCandyGuard,
    wrap,
    findCandyGuardPda,
    addConfigLines,
    mintV2,
    fetchCandyMachine,
    fetchCandyGuard,
    DefaultGuardSetArgs,
    mplCandyMachine,
} from '@metaplex-foundation/mpl-candy-machine'
import {
    createNft,
    mplTokenMetadata,
    fetchDigitalAsset,
} from '@metaplex-foundation/mpl-token-metadata'
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { loadPlatformWallet } from '../utils/wallet'

/**
 * Type definitions for Candy Machine guards
 */
interface CandyMachineGuards {
    solPayment?: {
        __option: 'Some' | 'None'
        value?: {
            lamports: bigint | number
            destination: string
        }
    }
    [key: string]: unknown
}

interface CandyMachineData {
    itemsAvailable: bigint | number
    itemsRedeemed: bigint | number
    guards?: CandyMachineGuards
}

/**
 * Helper: Validate that collection NFT (mint + metadata) exists on-chain with retry logic
 * This validates both the mint account and metadata account existence
 */
async function validateCollectionExists(umi: Umi, mintAddress: string, maxRetries = 5): Promise<void> {
    console.log(`Validating collection NFT on-chain: ${mintAddress}`)

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const asset = await fetchDigitalAsset(umi, umiPublicKey(mintAddress))
            console.log(`✓ Collection validated on attempt ${attempt}`)
            console.log(`  - Mint: ${asset.publicKey.toString()}`)
            console.log(`  - Name: ${asset.metadata.name}`)
            console.log(`  - Update Authority: ${asset.metadata.updateAuthority.toString()}`)
            return
        } catch (errorObj) {
            const errorMessage = errorObj instanceof Error ? errorObj.message : String(errorObj)
            console.log(`Attempt ${attempt}/${maxRetries}: Collection not yet available on RPC...`)

            if (attempt === maxRetries) {
                throw new Error(
                    `Collection NFT not found on-chain after ${maxRetries} attempts. ` +
                    `Address: ${mintAddress}\n` +
                    `This means either:\n` +
                    `  1. Transaction is not finalized yet (try increasing commitment level)\n` +
                    `  2. Wrong address is being used (verify mint.publicKey is correct)\n` +
                    `  3. RPC node is lagging behind\n` +
                    `Last error: ${errorMessage}`
                )
            }

            // Wait before retry (exponential backoff: 1s, 2s, 4s, 5s, 5s)
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
            console.log(`Waiting ${waitTime}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
        }
    }
}

/**
 * Helper: Validate that Candy Machine is initialized on-chain with retry logic
 * This validates that the Candy Machine account is properly initialized before adding items
 */
async function validateCandyMachineExists(umi: Umi, candyMachineAddress: string, maxRetries = 5): Promise<void> {
    console.log(`Validating Candy Machine on-chain: ${candyMachineAddress}`)

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const candyMachine = await fetchCandyMachine(umi, umiPublicKey(candyMachineAddress))
            const cmData = candyMachine as unknown as CandyMachineData

            console.log(`✓ Candy Machine validated on attempt ${attempt}`)
            console.log(`  - Address: ${candyMachine.publicKey.toString()}`)
            console.log(`  - Authority: ${candyMachine.authority.toString()}`)
            console.log(`  - Items Available: ${cmData.itemsAvailable?.toString() || '0'}`)
            console.log(`  - Collection: ${candyMachine.collectionMint.toString()}`)
            return
        } catch (errorObj) {
            const errorMessage = errorObj instanceof Error ? errorObj.message : String(errorObj)
            console.log(`Attempt ${attempt}/${maxRetries}: Candy Machine not yet initialized on RPC...`)

            if (attempt === maxRetries) {
                throw new Error(
                    `Candy Machine not found or not initialized on-chain after ${maxRetries} attempts. ` +
                    `Address: ${candyMachineAddress}\n` +
                    `This means either:\n` +
                    `  1. Create transaction is not finalized yet\n` +
                    `  2. Account was created but not initialized (AccountNotInitialized error)\n` +
                    `  3. Wrong address is being used\n` +
                    `  4. RPC node is lagging behind\n` +
                    `Last error: ${errorMessage}`
                )
            }

            // Wait before retry (exponential backoff: 1s, 2s, 4s, 5s, 5s)
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
            console.log(`Waiting ${waitTime}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
        }
    }
}

/**
 * Initialize UMI instance with keypair signer
 */
export function initializeUmiWithSigner(keypair: Keypair): Umi {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'

    const umi = createUmi(rpcUrl)
        .use(mplCandyMachine())
        // .use(mplCandyMachineCore())
        .use(mplTokenMetadata())
        .use(irysUploader())

    // Convert Solana Keypair to UMI KeypairSigner
    const umiKeypair = umi.eddsa.createKeypairFromSecretKey(keypair.secretKey)
    const myKeypairSigner = createSignerFromKeypair(umi, umiKeypair)

    // Set the signer identity using signerIdentity plugin
    umi.use(signerIdentity(myKeypairSigner))

    return umi
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
        // Use platform wallet for collection creation
        const authority = params.authority || loadPlatformWallet()
        const umi = initializeUmiWithSigner(authority)

        console.log('Using wallet for collection:', authority.publicKey.toString())

        // Generate collection mint
        const collectionMint = generateSigner(umi)

        console.log('Creating collection NFT with UMI...')
        console.log('Collection will have updateAuthority:', umi.identity.publicKey.toString())

        // Create collection NFT using mpl-token-metadata
        const tx = await createNft(umi, {
            mint: collectionMint,
            name: params.name,
            uri: params.uri,
            sellerFeeBasisPoints: percentAmount(0), // No royalties on collection
            isCollection: true,
            // Explicitly set update authority to current identity (Signer)
            updateAuthority: umi.identity,
        })

        const result = await tx.sendAndConfirm(umi, {
            confirm: { commitment: 'confirmed' },
        })

        const signature = Buffer.from(result.signature).toString('base64')
        const mintAddress = collectionMint.publicKey.toString()

        console.log('Collection transaction confirmed')
        console.log('Collection mint address:', mintAddress)
        console.log('Signature:', signature)

        // CRITICAL: Validate that collection NFT (mint + metadata) actually exists on-chain before returning
        console.log('\n=== Validating collection NFT on-chain ===')
        await validateCollectionExists(umi, mintAddress)
        console.log('✓ Collection fully validated and ready for use\n')

        return {
            collectionAddress: mintAddress,
            signature,
        }
    } catch (error) {
        console.error('Failed to create collection:', error)
        throw new Error(`Collection creation failed: ${error}`)
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
        // Use platform wallet for Candy Machine creation (must match collection authority)
        const authority = params.authority || loadPlatformWallet()
        const umi = initializeUmiWithSigner(authority)

        console.log('Using wallet for Candy Machine:', authority.publicKey.toString())
        console.log('Collection mint address:', params.collectionAddress)
        console.log('Candy Machine authority (umi.identity):', umi.identity.publicKey.toString())

        // Validate collection exists and has correct authority with retry logic
        console.log('\n=== Validating collection for Candy Machine ===')

        try {
            // Validate collection NFT exists on-chain (with retry logic)
            await validateCollectionExists(umi, params.collectionAddress)

            // Fetch and verify authority matches
            const collectionNft = await fetchDigitalAsset(umi, umiPublicKey(params.collectionAddress))
            console.log('\nVerifying collection authority:')
            console.log('  - Collection Update Authority:', collectionNft.metadata.updateAuthority.toString())
            console.log('  - Candy Machine Identity:', umi.identity.publicKey.toString())

            if (collectionNft.metadata.updateAuthority.toString() !== umi.identity.publicKey.toString()) {
                throw new Error(
                    `Collection updateAuthority mismatch!\n` +
                    `Expected: ${umi.identity.publicKey.toString()}\n` +
                    `Actual: ${collectionNft.metadata.updateAuthority.toString()}\n` +
                    `Both must be the same wallet to create Candy Machine for this collection.`
                )
            }

            console.log('✓ Collection authority matches - ready to create Candy Machine\n')
        } catch (errorObj) {
            const errorMessage = errorObj instanceof Error ? errorObj.message : String(errorObj)
            console.error('Failed to validate collection:', errorMessage)
            throw new Error(`Collection validation failed: ${errorMessage}`)
        }

        // Generate Candy Machine signer
        const candyMachine = generateSigner(umi)

        console.log('Creating Candy Machine V3 with UMI...')

        // Step 1: Create Candy Machine WITHOUT guards
        console.log('Creating Candy Machine with parameters:')
        console.log('  - candyMachine:', candyMachine.publicKey.toString())
        console.log('  - collectionMint:', params.collectionAddress)
        console.log('  - collectionUpdateAuthority:', umi.identity.publicKey.toString())
        console.log('  - itemsAvailable:', params.itemsAvailable)

        const createTx = await createCandyMachine(umi, {
            candyMachine,
            collectionMint: umiPublicKey(params.collectionAddress),
            collectionUpdateAuthority: umi.identity,
            tokenStandard: 0, // NonFungible = 0
            sellerFeeBasisPoints: percentAmount(params.sellerFeeBasisPoints / 100),
            itemsAvailable: BigInt(params.itemsAvailable),
            creators: [
                {
                    address: umi.identity.publicKey,
                    verified: true,
                    percentageShare: 100,
                },
            ],
            configLineSettings: some({
                prefixName: '',
                nameLength: 32,
                prefixUri: '',
                uriLength: 200,
                isSequential: true,
            }),
            // In CM V3, guards are NOT passed here!
        })

        const createResult = await createTx.sendAndConfirm(umi, {
            confirm: { commitment: 'confirmed' },
        })

        const createSignature = Buffer.from(createResult.signature).toString('base64')

        console.log('✓ Candy Machine created:', candyMachine.publicKey.toString())
        console.log('Transaction signature:', createSignature)

        // Step 2: Create Candy Guard with guards
        console.log('\n=== Creating Candy Guard ===')
        const guards: Partial<DefaultGuardSetArgs> = {
            solPayment: some({
                lamports: sol(params.priceInSol),
                destination: umiPublicKey(params.platformWallet),
            }),
            botTax: some({
                lamports: sol(0.01),
                lastInstruction: true,
            }),
        }

        // Add start date guard if provided
        if (params.startDate) {
            guards.startDate = some({
                date: dateTime(Math.floor(params.startDate.getTime() / 1000)),
            })
        }

        const priceAmount = sol(params.priceInSol)
        console.log('Configured guards:', {
            priceInSol: params.priceInSol,
            priceInLamports: typeof priceAmount === 'object' && 'basisPoints' in priceAmount
                ? priceAmount.basisPoints.toString()
                : priceAmount,
            destination: params.platformWallet,
            hasStartDate: !!params.startDate,
        })

        // Create Candy Guard (using Candy Machine as base)
        const guardTx = await createCandyGuard(umi, {
            base: candyMachine,
            guards,
        })

        const guardResult = await guardTx.sendAndConfirm(umi, {
            confirm: { commitment: 'confirmed' },
        })

        const guardSignature = Buffer.from(guardResult.signature).toString('base64')

        // Derive Candy Guard PDA from Candy Machine
        const [candyGuardPda] = findCandyGuardPda(umi, { base: candyMachine.publicKey })

        console.log('✓ Candy Guard created:', candyGuardPda.toString())
        console.log('Guard transaction signature:', guardSignature)

        // Now wrap the Candy Machine with the Candy Guard
        console.log('Wrapping Candy Machine with Candy Guard...')
        const wrapTx = await wrap(umi, {
            candyMachine: candyMachine.publicKey,
            candyGuard: candyGuardPda,
        })

        const wrapResult = await wrapTx.sendAndConfirm(umi, {
            confirm: { commitment: 'confirmed' },
        })

        const wrapSignature = Buffer.from(wrapResult.signature).toString('base64')
        console.log('✓ Candy Machine wrapped with Candy Guard')
        console.log('Wrap transaction signature:', wrapSignature)

        // CRITICAL: Validate Candy Machine is initialized before adding items
        console.log('\n=== Validating Candy Machine initialization ===')
        await validateCandyMachineExists(umi, candyMachine.publicKey.toString())
        console.log('✓ Candy Machine fully initialized and ready for items\n')

        // Add config lines (items) to Candy Machine in batches
        console.log(`Adding ${params.items.length} items to Candy Machine...`)

        const configLines = params.items.map((item) => ({
            name: item.name,
            uri: item.uri,
        }))

        // Add items in batches of 10
        const batchSize = 10
        for (let i = 0; i < configLines.length; i += batchSize) {
            const batch = configLines.slice(i, i + batchSize)

            try {
                console.log(`Preparing to add batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(configLines.length / batchSize)}...`)

                const addItemsTx = await addConfigLines(umi, {
                    candyMachine: candyMachine.publicKey,
                    index: i,
                    configLines: batch,
                })

                await addItemsTx.sendAndConfirm(umi, {
                    confirm: { commitment: 'confirmed' },
                })

                console.log(`✓ Added items ${i + 1} to ${Math.min(i + batchSize, configLines.length)}`)
            } catch (batchError) {
                console.error(`Failed to add batch starting at index ${i}:`, batchError)
                throw new Error(
                    `Failed to add config lines batch ${Math.floor(i / batchSize) + 1}: ${batchError}\n` +
                    `Candy Machine Address: ${candyMachine.publicKey.toString()}\n` +
                    `Items added so far: ${i}/${configLines.length}`
                )
            }
        }

        console.log('✓ Candy Machine fully configured with all items')

        // Final verification: fetch and log the Candy Machine state
        console.log('\n=== Final Candy Machine Verification ===')
        const finalCandyMachine = await fetchCandyMachine(umi, candyMachine.publicKey)
        const finalCmData = finalCandyMachine as unknown as CandyMachineData
        const finalCmAny = finalCandyMachine as unknown as Record<string, unknown>

        console.log('Final state:', {
            address: candyMachine.publicKey.toString(),
            itemsAvailable: finalCmData.itemsAvailable?.toString(),
            itemsRedeemed: finalCmData.itemsRedeemed?.toString(),
            authority: finalCandyMachine.authority.toString(),
            collectionMint: finalCandyMachine.collectionMint.toString(),
        })

        console.log('Final guards check:')
        console.log('  - Guards on top level:', finalCmData.guards)
        console.log('  - Guards in data:', finalCmAny.data ? (finalCmAny.data as Record<string, unknown>).guards : 'no data field')

        // Check if there's a separate guards account
        if (finalCmAny.mintAuthority) {
            console.log('  - mintAuthority:', finalCmAny.mintAuthority)
        }

        return {
            candyMachineAddress: candyMachine.publicKey.toString(),
            signature: createSignature,
        }
    } catch (error) {
        console.error('Failed to create Candy Machine:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)

        // Provide helpful context for common errors
        if (errorMessage.includes('AccountNotInitialized')) {
            throw new Error(
                `Candy Machine account not initialized (Error 3012).\n` +
                `This usually means:\n` +
                `  1. The create() transaction was not confirmed before adding items\n` +
                `  2. Using different UMI context for create vs addConfigLines\n` +
                `  3. RPC node is not synced with the latest state\n` +
                `Original error: ${errorMessage}`
            )
        }

        throw new Error(`Candy Machine creation failed: ${errorMessage}`)
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
        const umi = initializeUmiWithSigner(platformSigner)

        console.log(`Minting ${params.quantity} NFT(s) from Candy Machine...`)

        const nftMintAddresses: string[] = []
        let lastSignature = ''

        // Fetch Candy Machine to get price
        const candyMachineAccount = await fetchCandyMachine(umi, umiPublicKey(params.candyMachineAddress))

        // Get price from guards (using type assertion for compatibility)
        let pricePerNFT = 0
        const cmData = candyMachineAccount as unknown as CandyMachineData
        if (cmData.guards?.solPayment?.__option === 'Some' && cmData.guards.solPayment.value) {
            pricePerNFT = Number(cmData.guards.solPayment.value.lamports)
        }

        // Mint NFTs one by one
        for (let i = 0; i < params.quantity; i++) {
            const nftMint = generateSigner(umi)

            const mintTx = await mintV2(umi, {
                candyMachine: umiPublicKey(params.candyMachineAddress),
                nftMint,
                collectionMint: candyMachineAccount.collectionMint,
                collectionUpdateAuthority: candyMachineAccount.authority,
            })

            const result = await mintTx.sendAndConfirm(umi, {
                confirm: { commitment: 'confirmed' },
            })

            lastSignature = Buffer.from(result.signature).toString('base64')
            nftMintAddresses.push(nftMint.publicKey.toString())

            console.log(`Minted NFT ${i + 1}/${params.quantity}:`, nftMint.publicKey.toString())
        }

        const totalPaid = pricePerNFT * params.quantity

        console.log(`Minting complete. Total paid: ${totalPaid / LAMPORTS_PER_SOL} SOL`)

        return {
            nftMintAddresses,
            transactionSignature: lastSignature,
            totalPaid,
        }
    } catch (error) {
        console.error('Failed to mint NFT:', error)
        throw new Error(`NFT minting failed: ${error}`)
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
        const connection = new Connection(
            process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
        )

        // Calculate shares
        const organizerShare = Math.floor(params.totalAmount * 0.975)
        const platformShare = params.totalAmount - organizerShare

        console.log(`Distributing payment: ${params.totalAmount / LAMPORTS_PER_SOL} SOL`)
        console.log(`  Organizer (97.5%): ${organizerShare / LAMPORTS_PER_SOL} SOL`)
        console.log(`  Platform (2.5%): ${platformShare / LAMPORTS_PER_SOL} SOL`)

        // Create transfer transaction to organizer
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: platformWallet.publicKey,
                toPubkey: new PublicKey(params.organizerWallet),
                lamports: organizerShare,
            })
        )

        // Send and confirm transaction
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [platformWallet],
            { commitment: 'confirmed' }
        )

        console.log('Payment distributed successfully')
        console.log('Transaction signature:', signature)

        return {
            organizerShare,
            platformShare,
            transactionHash: signature,
        }
    } catch (error) {
        console.error('Failed to distribute payment:', error)
        throw new Error(`Payment distribution failed: ${error}`)
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
        // Use platform wallet (same as creation)
        const authority = loadPlatformWallet()
        const umi = initializeUmiWithSigner(authority)

        console.log('Fetching Candy Machine data:', candyMachineAddress)

        const candyMachine = await fetchCandyMachine(umi, umiPublicKey(candyMachineAddress))

        // Log raw data for debugging - check the full structure
        console.log('Raw Candy Machine object keys:', Object.keys(candyMachine))

        // Check if data field exists and what's inside
        const cmAny = candyMachine as unknown as Record<string, unknown>
        console.log('Candy Machine data field:', cmAny.data)
        console.log('Full Candy Machine structure sample:', {
            itemsRedeemed: candyMachine.itemsRedeemed,
            data: cmAny.data,
            items: cmAny.items,
        })

        // Use type assertion for compatibility with different versions
        const cmData = candyMachine as unknown as CandyMachineData

        // Try to get itemsAvailable from different possible locations
        let itemsAvailableRaw: bigint | number | undefined = cmData.itemsAvailable

        // If not on top level, check in data.itemsAvailable
        if (itemsAvailableRaw === undefined && cmAny.data) {
            const dataObj = cmAny.data as Record<string, unknown>
            itemsAvailableRaw = dataObj.itemsAvailable as bigint | number | undefined
            console.log('Found itemsAvailable in data field:', itemsAvailableRaw)
        }

        // If still not found, check configLineSettings
        if (itemsAvailableRaw === undefined && cmAny.data) {
            const dataObj = cmAny.data as Record<string, unknown>
            if (dataObj.configLineSettings) {
                console.log('Checking configLineSettings...')
            }
        }

        const itemsRedeemedRaw = cmData.itemsRedeemed

        console.log('After extraction:', {
            itemsAvailableRaw,
            itemsRedeemedRaw,
            itemsAvailableType: typeof itemsAvailableRaw,
            itemsRedeemedType: typeof itemsRedeemedRaw,
        })

        const itemsAvailable = typeof itemsAvailableRaw === 'bigint'
            ? Number(itemsAvailableRaw)
            : Number(itemsAvailableRaw || 0)
        const itemsRedeemed = typeof itemsRedeemedRaw === 'bigint'
            ? Number(itemsRedeemedRaw)
            : Number(itemsRedeemedRaw || 0)

        // Get price from guards
        // In Candy Machine V3, guards are stored in a separate Candy Guard PDA
        console.log('Checking guards:', {
            guardsInCM: cmData.guards,
            mintAuthority: candyMachine.mintAuthority.toString(),
        })

        let priceInLamports = 0

        // Try to fetch Candy Guard separately (V3 stores guards in separate PDA)
        try {
            console.log('Fetching Candy Guard from mintAuthority:', candyMachine.mintAuthority.toString())
            const candyGuard = await fetchCandyGuard(umi, candyMachine.mintAuthority)
            console.log('Candy Guard fetched successfully')
            console.log('Candy Guard keys:', Object.keys(candyGuard))

            // Guards are in candyGuard.guards.default or candyGuard.guards
            const guardAny = candyGuard as unknown as Record<string, unknown>
            if (guardAny.guards) {
                const guards = guardAny.guards as Record<string, unknown>
                console.log('Guards object keys:', Object.keys(guards))

                // Check for default group
                if (guards.default) {
                    const defaultGuards = guards.default as Record<string, unknown>
                    console.log('Default guards keys:', Object.keys(defaultGuards))

                    if (defaultGuards.solPayment) {
                        const solPayment = defaultGuards.solPayment as Record<string, unknown>
                        console.log('Default solPayment structure:', solPayment)
                        if (solPayment.__option === 'Some' && solPayment.value) {
                            const value = solPayment.value as Record<string, unknown>
                            const lamportsValue = value.lamports

                            if (lamportsValue && typeof lamportsValue === 'object' && 'basisPoints' in lamportsValue) {
                                const lamportsObj = lamportsValue as Record<string, unknown>
                                priceInLamports = Number(lamportsObj.basisPoints)
                                console.log('✓ Found price in Candy Guard default.solPayment.basisPoints:', priceInLamports)
                            } else {
                                priceInLamports = Number(lamportsValue)
                                console.log('✓ Found price in Candy Guard default.solPayment:', priceInLamports)
                            }
                        }
                    }
                }

                // Check top-level solPayment
                if (priceInLamports === 0 && guards.solPayment) {
                    const solPayment = guards.solPayment as Record<string, unknown>
                    console.log('Top-level solPayment structure:', solPayment)
                    console.log('solPayment keys:', Object.keys(solPayment))
                    console.log('solPayment.__option:', solPayment.__option)

                    // Try different access patterns
                    if (solPayment.__option === 'Some' && solPayment.value) {
                        const value = solPayment.value as Record<string, unknown>
                        console.log('solPayment.value:', value)

                        // lamports can be a number or an object with basisPoints
                        const lamportsValue = value.lamports
                        if (lamportsValue && typeof lamportsValue === 'object' && 'basisPoints' in lamportsValue) {
                            // New format: { basisPoints: 10000000000n, identifier: 'SOL', decimals: 9 }
                            const lamportsObj = lamportsValue as Record<string, unknown>
                            priceInLamports = Number(lamportsObj.basisPoints)
                            console.log('✓ Found price in Candy Guard solPayment.value.lamports.basisPoints:', priceInLamports)
                        } else {
                            // Old format: direct number
                            priceInLamports = Number(lamportsValue)
                            console.log('✓ Found price in Candy Guard solPayment (Some pattern):', priceInLamports)
                        }
                    } else if (solPayment.lamports) {
                        // Direct access without __option wrapper
                        const lamportsValue = solPayment.lamports
                        if (lamportsValue && typeof lamportsValue === 'object' && 'basisPoints' in lamportsValue) {
                            const lamportsObj = lamportsValue as Record<string, unknown>
                            priceInLamports = Number(lamportsObj.basisPoints)
                            console.log('✓ Found price in Candy Guard solPayment.lamports.basisPoints (direct):', priceInLamports)
                        } else {
                            priceInLamports = Number(lamportsValue)
                            console.log('✓ Found price in Candy Guard solPayment (direct):', priceInLamports)
                        }
                    } else if (solPayment.destination) {
                        // Alternative structure with destination and lamports at same level
                        priceInLamports = Number(solPayment.lamports || 0)
                        console.log('✓ Found price in Candy Guard solPayment (alt structure):', priceInLamports)
                    }
                }
            }
        } catch (guardError) {
            console.log('Could not fetch Candy Guard:', guardError instanceof Error ? guardError.message : guardError)
            console.log('Falling back to checking Candy Machine guards directly...')

            // Fallback: Try old method
            if (cmData.guards?.solPayment?.__option === 'Some' && cmData.guards.solPayment.value) {
                priceInLamports = Number(cmData.guards.solPayment.value.lamports)
                console.log('Found price in CM guards.solPayment:', priceInLamports)
            }
        }

        console.log('Final price in lamports:', priceInLamports)

        const result = {
            itemsAvailable,
            itemsRedeemed,
            itemsRemaining: itemsAvailable - itemsRedeemed,
            price: priceInLamports / LAMPORTS_PER_SOL,
            priceInLamports: priceInLamports.toString(),
            authority: candyMachine.authority.toString(),
            collectionAddress: candyMachine.collectionMint.toString(),
            // Don't include full guards object (contains BigInt and causes JSON serialization issues)
            // guards: fetchedGuards || cmData.guards || {},
        }

        console.log('Formatted Candy Machine data:', result)

        return result
    } catch (error) {
        console.error('Failed to get Candy Machine data:', error)
        throw new Error(`Failed to fetch Candy Machine data: ${error}`)
    }
}
