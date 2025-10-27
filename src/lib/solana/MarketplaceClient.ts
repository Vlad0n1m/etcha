import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Metaplex, walletAdapterIdentity, lamports } from '@metaplex-foundation/js';
import { WalletContextState } from '@solana/wallet-adapter-react';

/**
 * Client-side Marketplace utilities for NFT listings
 * These functions run in the browser and use the wallet adapter for signing
 */

export interface ListingResult {
    listingAddress: string;
    transactionHash: string;
    price: number;
}

/**
 * Create a listing for an NFT on the marketplace
 * This function signs the transaction with the user's wallet
 */
export async function createListing(
    wallet: WalletContextState,
    auctionHouseAddress: string,
    nftMintAddress: string,
    priceInSol: number
): Promise<ListingResult> {
    if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Wallet not connected or does not support signing');
    }

    try {
        console.log('🏷️ Creating listing on blockchain...');
        console.log('Auction House:', auctionHouseAddress);
        console.log('NFT:', nftMintAddress);
        console.log('Price:', priceInSol, 'SOL');

        // Get RPC endpoint from environment
        const rpcEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
        const connection = new Connection(rpcEndpoint, 'confirmed');

        // Create Metaplex instance with wallet adapter
        const metaplex = Metaplex.make(connection).use(walletAdapterIdentity(wallet));

        // Get Auction House
        const auctionHouse = await metaplex.auctionHouse().findByAddress({
            address: new PublicKey(auctionHouseAddress),
        });

        console.log('📦 Auction House loaded');

        // Create the listing (this will prompt the user to sign the transaction)
        const { listing, response } = await metaplex.auctionHouse().list({
            auctionHouse,
            mintAccount: new PublicKey(nftMintAddress),
            price: lamports(priceInSol * 1e9), // Convert SOL to lamports
        });

        console.log('✅ Listing created on blockchain!');
        console.log('Transaction:', response.signature);
        console.log('Listing Address:', listing.tradeStateAddress.toBase58());

        return {
            listingAddress: listing.tradeStateAddress.toBase58(),
            transactionHash: response.signature,
            price: priceInSol,
        };
    } catch (error) {
        console.error('❌ Error creating listing:', error);
        throw new Error(`Failed to create listing: ${(error as Error).message}`);
    }
}

/**
 * Cancel a listing on the marketplace
 */
export async function cancelListing(
    wallet: WalletContextState,
    auctionHouseAddress: string,
    listingAddress: string
): Promise<{ transactionHash: string }> {
    if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Wallet not connected or does not support signing');
    }

    try {
        console.log('🚫 Cancelling listing on blockchain...');
        console.log('Listing:', listingAddress);

        const rpcEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
        const connection = new Connection(rpcEndpoint, 'confirmed');

        const metaplex = Metaplex.make(connection).use(walletAdapterIdentity(wallet));

        // Get Auction House
        const auctionHouse = await metaplex.auctionHouse().findByAddress({
            address: new PublicKey(auctionHouseAddress),
        });

        // Find the listing
        const lazyListing = await metaplex.auctionHouse().findListingByTradeState({
            auctionHouse,
            tradeStateAddress: new PublicKey(listingAddress),
        });

        // Load full listing if needed
        const listing = (lazyListing as any).model !== 'listing'
            ? await metaplex.auctionHouse().loadListing({ lazyListing } as any)
            : lazyListing;

        // Cancel the listing
        const { response } = await metaplex.auctionHouse().cancelListing({
            auctionHouse,
            listing,
        });

        console.log('✅ Listing cancelled on blockchain!');
        console.log('Transaction:', response.signature);

        return {
            transactionHash: response.signature,
        };
    } catch (error) {
        console.error('❌ Error cancelling listing:', error);
        throw new Error(`Failed to cancel listing: ${(error as Error).message}`);
    }
}

/**
 * Buy an NFT from the marketplace
 */
export async function buyFromMarketplace(
    wallet: WalletContextState,
    auctionHouseAddress: string,
    listingAddress: string
): Promise<{ transactionHash: string; nftAddress: string }> {
    if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Wallet not connected or does not support signing');
    }

    try {
        console.log('🛒 Buying NFT from marketplace...');
        console.log('Listing:', listingAddress);

        const rpcEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
        const connection = new Connection(rpcEndpoint, 'confirmed');

        const metaplex = Metaplex.make(connection).use(walletAdapterIdentity(wallet));

        // Get Auction House
        const auctionHouse = await metaplex.auctionHouse().findByAddress({
            address: new PublicKey(auctionHouseAddress),
        });

        // Find the listing
        const lazyListing = await metaplex.auctionHouse().findListingByTradeState({
            auctionHouse,
            tradeStateAddress: new PublicKey(listingAddress),
        });

        // Load full listing
        const listing = (lazyListing as any).model !== 'listing'
            ? await metaplex.auctionHouse().loadListing({ lazyListing } as any)
            : lazyListing;

        console.log('💰 Listing price:', listing.price.basisPoints.toNumber() / 1e9, 'SOL');

        // Check buyer balance
        const buyerBalance = await connection.getBalance(wallet.publicKey);
        const buyerBalanceSOL = buyerBalance / 1e9;
        const listingPrice = listing.price.basisPoints.toNumber() / 1e9;

        if (buyerBalanceSOL < listingPrice) {
            throw new Error(
                `Insufficient SOL balance. Required: ${listingPrice} SOL, Available: ${buyerBalanceSOL.toFixed(4)} SOL`
            );
        }

        // Execute purchase
        const { purchase, response } = await metaplex.auctionHouse().buy({
            auctionHouse,
            listing,
        });

        console.log('✅ Purchase successful!');
        console.log('Transaction:', response.signature);

        // Get NFT address
        const nftAddress = (listing as any).asset.address.toBase58();

        return {
            transactionHash: response.signature,
            nftAddress,
        };
    } catch (error) {
        console.error('❌ Error buying from marketplace:', error);
        throw new Error(`Failed to purchase: ${(error as Error).message}`);
    }
}

