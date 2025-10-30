/**
 * Auction House Service
 * Functions for resale functionality using Metaplex SDK
 * 
 * For now, we use simple NFT + SOL transfers instead of full Auction House
 * This allows direct peer-to-peer transactions
 */

import { Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js'
import { Connection } from '@solana/web3.js'
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, createTransferInstruction } from '@solana/spl-token'

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
 * Initialize Auction House for the platform
 * 
 * @param authority - Authority keypair
 * @param sellerFeeBasisPoints - Platform fee in basis points (e.g., 250 = 2.5%)
 * @returns Auction House address
 * 
 * @throws {Error} Not implemented yet
 */
export async function initializeAuctionHouse(
    authority: Keypair,
    sellerFeeBasisPoints: number = 250 // 2.5% default
): Promise<string> {
    throw new Error('Auction House: Not implemented yet. Will be added in the resale feature iteration.')
}

/**
 * Create a listing for NFT resale
 * 
 * @param params.auctionHouse - Auction House address
 * @param params.nftMint - NFT mint address to list
 * @param params.price - Listing price in SOL
 * @param params.seller - Seller's keypair
 * @returns Listing address
 * 
 * @throws {Error} Not implemented yet
 */
export async function createResaleListing(params: {
    auctionHouse: string
    nftMint: string
    price: number
    seller: Keypair
}): Promise<string> {
    throw new Error('Resale Listing: Not implemented yet. Will be added in the resale feature iteration.')
}

/**
 * Transfer NFT from seller to buyer using Metaplex SDK
 * 
 * @param params.nftMintAddress - NFT mint address
 * @param params.sellerKeypair - Seller's keypair (must own the NFT)
 * @param params.buyerPublicKey - Buyer's public key
 * @returns Transaction signature
 */
export async function transferNFTToBuyer(params: {
    nftMintAddress: string
    sellerKeypair: Keypair
    buyerPublicKey: PublicKey
}): Promise<string> {
    try {
        const connection = getConnection()
        const metaplex = Metaplex.make(connection).use(keypairIdentity(params.sellerKeypair))

        console.log('Transferring NFT:', params.nftMintAddress)
        console.log('From seller:', params.sellerKeypair.publicKey.toString())
        console.log('To buyer:', params.buyerPublicKey.toString())

        // Derive the associated token account address for the seller
        // This is the standard way to find token account for a specific mint and owner
        const mintPublicKey = new PublicKey(params.nftMintAddress)
        const sellerTokenAccountAddress = getAssociatedTokenAddressSync(
            mintPublicKey,
            params.sellerKeypair.publicKey,
            false, // allowOwnerOffCurve
            TOKEN_PROGRAM_ID
        )
        const buyerTokenAccountAddress = getAssociatedTokenAddressSync(mintPublicKey, params.buyerPublicKey)
        console.log("SELlER TOKEN ACCOUNT: ", sellerTokenAccountAddress.toString())
        console.log("BUYER TOKEN ACCOUNT: ", buyerTokenAccountAddress.toString())
        const transaction = new Transaction()

        // 3. Создай ATA покупателя, если нет
        const buyerATAInfo = await connection.getAccountInfo(buyerTokenAccountAddress)
        if (!buyerATAInfo) {
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    params.sellerKeypair.publicKey, // payer
                    buyerTokenAccountAddress,
                    params.buyerPublicKey,
                    mintPublicKey
                )
            )
        }

        console.log('Derived seller token account address:', params.sellerKeypair.publicKey.toString())
        console.log('Mint address:', params.nftMintAddress)
        console.log('Seller internal wallet:', params.sellerKeypair.publicKey.toString())

        // First, verify that seller actually owns this NFT by checking all their NFTs
        // console.log('Verifying seller owns NFT by checking all NFTs in wallet...')
        // const sellerNfts = await metaplex.nfts().findAllByOwner({
        //     owner: params.sellerKeypair.publicKey,
        // })
        
        // console.log(`Seller has ${sellerNfts.length} NFTs in wallet`)
        
        // Check if the NFT is in seller's wallet
        // const sellerOwnsNFT = sellerNfts.some(nft => 
        //     nft.address.toBase58() === params.nftMintAddress 
        // )
        
        // if (!sellerOwnsNFT) {
        //     console.error('NFT not found in seller wallet. Seller NFTs:', sellerNfts.map(n => ({ address: n.address.toBase58(), mint: n.mint.address.toBase58() })))
        //     throw new Error(`Seller does not own this NFT. NFT ${params.nftMintAddress} not found in seller's wallet (${params.sellerKeypair.publicKey.toString()}).`)
        // }
        
        // console.log('NFT verified in seller wallet')

        // Verify token account exists and has balance
        // const tokenAccountInfo = await connection.getAccountInfo(sellerTokenAccountAddress)
        // console.log(tokenAccountInfo);
        // console.log(tokenAccountInfo);
        // console.log(tokenAccountInfo);
        // if (!tokenAccountInfo) {
        //     // Token account might not exist if NFT is in a different format
        //     // But we already verified NFT is in seller's wallet, so try to find it differently
        //     console.warn(`Token account ${ params.sellerKeypair.publicKey.toString()} does not exist, but NFT is in seller wallet. Trying alternative method...`)
            
        //     // Find the NFT by mint address
        //     const nft = await metaplex.nfts().findByMint({
        //         mintAddress: mintPublicKey,
        //         loadJsonMetadata: false,
        //     })
            
        //     // Verify the NFT actually belongs to seller
        //     // const nftOwner = nft.owners?.[0]?.address
        //     // if (!nftOwner || nftOwner.toBase58() !== params.sellerKeypair.publicKey.toBase58()) {
        //     //     throw new Error(`NFT owner mismatch. NFT is owned by ${nftOwner?.toBase58() || 'unknown'}, but seller is ${params.sellerKeypair.publicKey.toString()}`)
        //     // }
            
        //     console.log('Found NFT:', nft.address.toBase58())
        //     console.log('NFT mint:', nft.mint.address.toString())
        //     // console.log('NFT owner:', nftOwner.toBase58())
            
        //     // Transfer NFT directly
        //     console.log('Attempting NFT transfer...')
        //     const result = await metaplex.nfts().transfer({
        //         nft: nft,
        //         toOwner: params.buyerPublicKey,
        //     })
            
        //     console.log('NFT transferred successfully. Signature:', result.response.signature)
        //     return result.response.signature
        // }

        // Get token account balance
        const tokenAccountBalance = await connection.getTokenAccountBalance(sellerTokenAccountAddress)
        console.log('Token account balance:', tokenAccountBalance.value.uiAmount, 'tokens')
        
        if (tokenAccountBalance.value.uiAmount === null || tokenAccountBalance.value.uiAmount === 0) {
            throw new Error(`Seller token account has zero balance. Cannot transfer NFT.`)
        }

        // Find the NFT by mint address for metadata
        const nft = await metaplex.nfts().findByMint({
            mintAddress: mintPublicKey,
            loadJsonMetadata: false, // Not needed for transfer
        })

        console.log('Found NFT:', nft.address.toBase58())
        console.log('NFT mint:', nft.mint.address.toString())
        console.log('Seller token account:', sellerTokenAccountAddress.toString())

        
        
        
        
        console.log('Attempting NFT transfer...')

        transaction.add(
            createTransferInstruction(
                sellerTokenAccountAddress,                    // from (seller's ATA)
                buyerTokenAccountAddress,                     // to (buyer's ATA)
                params.sellerKeypair.publicKey, // owner (seller)
                1                             // amount (NFT = 1)
            )
        )


        // // Transfer NFT using Metaplex
        // // Metaplex SDK should handle the transfer using the keypairIdentity
        // const result = await metaplex.nfts().transfer({
        //     nft: nft,
        //     toOwner: params.buyerPublicKey,
        // })

        const signature = await connection.sendTransaction(transaction, [params.sellerKeypair])
        await connection.confirmTransaction(signature, 'confirmed')
        
        console.log('NFT transferred successfully:', signature)
        return signature
    } catch (error) {
        console.error('Failed to transfer NFT:', error)
        throw new Error(`NFT transfer failed: ${error instanceof Error ? error.message : String(error)}`)
    }
}

/**
 * Transfer SOL from buyer to seller
 * 
 * @param params.buyerKeypair - Buyer's keypair
 * @param params.sellerPublicKey - Seller's public key
 * @param params.amountSOL - Amount in SOL
 * @returns Transaction signature
 */
export async function transferSOLToSeller(params: {
    buyerKeypair: Keypair
    sellerPublicKey: PublicKey
    amountSOL: number
}): Promise<string> {
    try {
        const connection = getConnection()

        console.log('Transferring SOL:', params.amountSOL, 'SOL')
        console.log('From buyer:', params.buyerKeypair.publicKey.toString())
        console.log('To seller:', params.sellerPublicKey.toString())

        // Create transfer transaction
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: params.buyerKeypair.publicKey,
                toPubkey: params.sellerPublicKey,
                lamports: Math.floor(params.amountSOL * LAMPORTS_PER_SOL),
            })
        )

        // Send transaction
        const signature = await connection.sendTransaction(transaction, [params.buyerKeypair], {
            skipPreflight: false,
        })

        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed')

        console.log('SOL transferred successfully. Signature:', signature)
        return signature
    } catch (error) {
        console.error('Failed to transfer SOL:', error)
        throw new Error(`SOL transfer failed: ${error instanceof Error ? error.message : String(error)}`)
    }
}

/**
 * Buy NFT from resale listing
 * Combines NFT transfer and SOL transfer in separate transactions
 * (Atomic transfers would require more complex setup with Auction House)
 * 
 * @param params.nftMintAddress - NFT mint address
 * @param params.sellerKeypair - Seller's keypair (must own the NFT)
 * @param params.buyerKeypair - Buyer's keypair
 * @param params.priceSOL - Price in SOL
 * @returns Object with both transaction signatures
 */
export async function buyFromResale(params: {
    nftMintAddress: string
    sellerKeypair: Keypair
    buyerKeypair: Keypair
    priceSOL: number
}): Promise<{
    nftTransferSignature: string
    solTransferSignature: string
}> {
    try {
        console.log('Starting resale purchase...')
        console.log('NFT:', params.nftMintAddress)
        console.log('Price:', params.priceSOL, 'SOL')

        // Step 1: Transfer SOL first (buyer pays seller)
        console.log('Step 1: Transferring SOL from buyer to seller...')
        const solTransferSignature = await transferSOLToSeller({
            buyerKeypair: params.buyerKeypair,
            sellerPublicKey: params.sellerKeypair.publicKey,
            amountSOL: params.priceSOL,
        })

        // Step 2: Transfer NFT (seller transfers to buyer)
        console.log('Step 2: Transferring NFT from seller to buyer...')
        const nftTransferSignature = await transferNFTToBuyer({
            nftMintAddress: params.nftMintAddress,
            sellerKeypair: params.sellerKeypair,
            buyerPublicKey: params.buyerKeypair.publicKey,
        })

        console.log('Resale purchase completed successfully!')
        return {
            nftTransferSignature,
            solTransferSignature,
        }
    } catch (error) {
        console.error('Failed to complete resale purchase:', error)
        throw new Error(`Resale purchase failed: ${error instanceof Error ? error.message : String(error)}`)
    }
}

/**
 * Cancel a resale listing
 * 
 * @param params.auctionHouse - Auction House address
 * @param params.listing - Listing address
 * @param params.seller - Seller's keypair
 * @returns Transaction signature
 * 
 * @throws {Error} Not implemented yet
 */
export async function cancelListing(params: {
    auctionHouse: string
    listing: string
    seller: Keypair
}): Promise<string> {
    throw new Error('Cancel Listing: Not implemented yet. Will be added in the resale feature iteration.')
}

/**
 * Get all active listings for an NFT collection
 * 
 * @param auctionHouse - Auction House address
 * @param collectionAddress - NFT collection address
 * @returns Array of listing data
 * 
 * @throws {Error} Not implemented yet
 */
export async function getCollectionListings(
    auctionHouse: string,
    collectionAddress: string
): Promise<any[]> {
    throw new Error('Get Listings: Not implemented yet. Will be added in the resale feature iteration.')
}

/**
 * Get seller's active listings
 * 
 * @param auctionHouse - Auction House address
 * @param sellerWallet - Seller's wallet address
 * @returns Array of listing data
 * 
 * @throws {Error} Not implemented yet
 */
export async function getSellerListings(
    auctionHouse: string,
    sellerWallet: string
): Promise<any[]> {
    throw new Error('Get Seller Listings: Not implemented yet. Will be added in the resale feature iteration.')
}

// Export types for future use
export interface ListingData {
    address: string
    nftMint: string
    seller: string
    price: number
    createdAt: number
    status: 'active' | 'sold' | 'cancelled'
}

export interface AuctionHouseData {
    address: string
    authority: string
    sellerFeeBasisPoints: number
    treasury: string
    createdAt: number
}

