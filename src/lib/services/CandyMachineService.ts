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
    KeypairSigner,
    Signer as UmiSigner,
    createSignerFromKeypair,
} from '@metaplex-foundation/umi'
import {
    create as createCandyMachine,
    addConfigLines,
    mintV2,
    fetchCandyMachine,
    DefaultGuardSetArgs,
    safeFetchCandyGuard,
} from '@metaplex-foundation/mpl-candy-machine'
import {
    createNft,
    mplTokenMetadata,
} from '@metaplex-foundation/mpl-token-metadata'
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { loadPlatformWallet, loadCandyMachineAuthority, solToLamports } from '../utils/wallet'

/**
 * Initialize UMI instance with keypair signer
 */
export function initializeUmiWithSigner(keypair: Keypair): Umi {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'

    const umi = createUmi(rpcUrl)
        .use(mplTokenMetadata())
        .use(irysUploader())

    // Convert Solana Keypair to UMI KeypairSigner
    const umiKeypair = umi.eddsa.createKeypairFromSecretKey(keypair.secretKey)
    const myKeypairSigner = createSignerFromKeypair(umi, umiKeypair)
    umi.use({ install(umi) { umi.identity = myKeypairSigner } })

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
        const authority = params.authority || loadCandyMachineAuthority()
        const umi = initializeUmiWithSigner(authority)

        // Generate collection mint
        const collectionMint = generateSigner(umi)

        console.log('Creating collection NFT with UMI...')

        // Create collection NFT using mpl-token-metadata
        const tx = await createNft(umi, {
            mint: collectionMint,
            name: params.name,
            uri: params.uri,
            sellerFeeBasisPoints: percentAmount(0), // No royalties on collection
            isCollection: true,
        })

        const result = await tx.sendAndConfirm(umi, {
            confirm: { commitment: 'confirmed' },
        })

        const signature = Buffer.from(result.signature).toString('base64')

        console.log('Collection created:', collectionMint.publicKey.toString())
        console.log('Signature:', signature)

        return {
            collectionAddress: collectionMint.publicKey.toString(),
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
        const authority = params.authority || loadCandyMachineAuthority()
        const umi = initializeUmiWithSigner(authority)

        // Generate Candy Machine signer
        const candyMachine = generateSigner(umi)

        console.log('Creating Candy Machine V3 with UMI...')

        // Configure guards
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

        // Create Candy Machine
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
            guards,
        })

        const createResult = await createTx.sendAndConfirm(umi, {
            confirm: { commitment: 'confirmed' },
        })

        const createSignature = Buffer.from(createResult.signature).toString('base64')

        console.log('Candy Machine created:', candyMachine.publicKey.toString())

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

            const addItemsTx = await addConfigLines(umi, {
                candyMachine: candyMachine.publicKey,
                index: i,
                configLines: batch,
            })

            await addItemsTx.sendAndConfirm(umi, {
                confirm: { commitment: 'confirmed' },
            })

            console.log(`Added items ${i + 1} to ${Math.min(i + batchSize, configLines.length)}`)
        }

        console.log('Candy Machine fully configured')

        return {
            candyMachineAddress: candyMachine.publicKey.toString(),
            signature: createSignature,
        }
    } catch (error) {
        console.error('Failed to create Candy Machine:', error)
        throw new Error(`Candy Machine creation failed: ${error}`)
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
        const cmData = candyMachineAccount as any
        if (cmData.guards?.solPayment?.__option === 'Some') {
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
    guards: any
}> {
    try {
        const authority = loadCandyMachineAuthority()
        const umi = initializeUmiWithSigner(authority)

        console.log('Fetching Candy Machine data:', candyMachineAddress)

        const candyMachine = await fetchCandyMachine(umi, umiPublicKey(candyMachineAddress))

        // Use type assertion for compatibility with different versions
        const cmData = candyMachine as any

        // Get price from guards
        let priceInLamports = 0
        if (cmData.guards?.solPayment?.__option === 'Some') {
            priceInLamports = Number(cmData.guards.solPayment.value.lamports)
        }

        return {
            itemsAvailable: Number(cmData.itemsAvailable || 0),
            itemsRedeemed: Number(cmData.itemsRedeemed || 0),
            itemsRemaining: Number(cmData.itemsAvailable || 0) - Number(cmData.itemsRedeemed || 0),
            price: priceInLamports / LAMPORTS_PER_SOL,
            priceInLamports: priceInLamports.toString(),
            authority: candyMachine.authority.toString(),
            collectionAddress: candyMachine.collectionMint.toString(),
            guards: cmData.guards || {},
        }
    } catch (error) {
        console.error('Failed to get Candy Machine data:', error)
        throw new Error(`Failed to fetch Candy Machine data: ${error}`)
    }
}
