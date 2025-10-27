import { PublicKey } from '@solana/web3.js';
import { Metaplex, lamports, toBigNumber } from '@metaplex-foundation/js';
import { SolanaService } from './SolanaService';

/**
 * Marketplace Service for handling NFT secondary sales via Metaplex Auction House
 * Platform fee: 2.5% (250 basis points)
 */
export class MarketplaceService {
    private solanaService: SolanaService;

    constructor(solanaService: SolanaService) {
        this.solanaService = solanaService;
    }

    /**
     * Create Auction House marketplace (one-time setup)
     * This should be called once to initialize the platform's marketplace
     */
    async createMarketplace(): Promise<string> {
        try {
            console.log('🏪 Creating Auction House marketplace...');
            const metaplex = this.solanaService.getMetaplex();

            const { auctionHouse } = await metaplex.auctionHouse().create({
                sellerFeeBasisPoints: 250, // 2.5% marketplace fee
                canChangeSalePrice: false,
                requiresSignOff: false, // Allow direct sales without platform approval
            });

            console.log('✅ Auction House created successfully!');
            console.log('Auction House Address:', auctionHouse.address.toBase58());

            return auctionHouse.address.toBase58();
        } catch (error) {
            console.error('❌ Error creating Auction House:', error);
            throw new Error(`Failed to create marketplace: ${(error as Error).message}`);
        }
    }

    /**
     * List NFT for sale on marketplace
     * Note: This requires the seller to sign the transaction
     */
    async listTicketForSale(
        auctionHouseAddress: string,
        nftMintAddress: string,
        priceInSol: number,
        sellerPublicKey: PublicKey
    ): Promise<{ listingAddress: string; price: number; transaction: string }> {
        try {
            console.log('🏷️ Preparing NFT listing...');
            console.log('Auction House:', auctionHouseAddress);
            console.log('NFT:', nftMintAddress);
            console.log('Price:', priceInSol, 'SOL');
            console.log('Seller:', sellerPublicKey.toBase58());

            const metaplex = this.solanaService.getMetaplex();

            // Get Auction House model
            const auctionHouse = await metaplex.auctionHouse().findByAddress({
                address: new PublicKey(auctionHouseAddress),
            });

            // Create listing (this will be signed by the seller on the frontend)
            const { listing, response } = await metaplex.auctionHouse().list({
                auctionHouse,
                mintAccount: new PublicKey(nftMintAddress),
                seller: sellerPublicKey,
                price: lamports(priceInSol * 1e9), // Convert SOL to lamports
            });

            console.log('✅ Listing prepared successfully!');
            console.log('Listing Address:', listing.tradeStateAddress.toBase58());

            return {
                listingAddress: listing.tradeStateAddress.toBase58(),
                price: priceInSol,
                transaction: response.signature,
            };
        } catch (error) {
            console.error('❌ Error preparing listing:', error);
            throw new Error(`Failed to prepare listing: ${(error as Error).message}`);
        }
    }

    /**
     * Buy NFT from marketplace (instant purchase)
     * Note: This requires the buyer to sign the transaction
     */
    async buyTicketFromMarketplace(
        auctionHouseAddress: string,
        listingAddress: string,
        nftMintAddress: string,
        buyerPublicKey: PublicKey
    ): Promise<{ purchaseAddress: string; nftAddress: string; transaction: string }> {
        try {
            console.log('🛒 Preparing NFT purchase...');
            console.log('Auction House:', auctionHouseAddress);
            console.log('Listing:', listingAddress);
            console.log('NFT Mint:', nftMintAddress);
            console.log('Buyer:', buyerPublicKey.toBase58());

            const metaplex = this.solanaService.getMetaplex();

            // Get Auction House model
            const auctionHouse = await metaplex.auctionHouse().findByAddress({
                address: new PublicKey(auctionHouseAddress),
            });

            const nftMintPublicKey = new PublicKey(nftMintAddress);

            // Load NFT metadata first to get complete asset information
            console.log('📦 Loading NFT metadata...');
            const nft = await metaplex.nfts().findByMint({ mintAddress: nftMintPublicKey });
            console.log('✅ NFT loaded:', nft.name);

            // Find the listing by trade state
            const lazyListing = await metaplex.auctionHouse().findListingByTradeState({
                auctionHouse,
                tradeStateAddress: new PublicKey(listingAddress),
            });

            console.log('📋 Found listing, loading full details...');

            // Load the full listing with the NFT asset
            const listing = await metaplex.auctionHouse().loadListing({
                lazyListing,
                loadJsonMetadata: true,
            } as any);

            // Manually attach the NFT asset if it's missing
            if (!(listing as any).asset) {
                console.log('🔧 Manually attaching NFT asset to listing...');
                (listing as any).asset = nft;
            }

            console.log('🔍 Listing trade state:', listing.tradeStateAddress.toBase58());
            console.log('🔍 NFT mint:', nftMintAddress);

            console.log('💰 Listing price:', listing.price.basisPoints.toNumber() / 1e9, 'SOL');

            // Check buyer balance
            const buyerBalance = await this.solanaService.getConnection().getBalance(buyerPublicKey);
            const buyerBalanceSOL = buyerBalance / 1e9;
            const listingPrice = listing.price.basisPoints.toNumber() / 1e9;

            if (buyerBalanceSOL < listingPrice) {
                throw new Error(
                    `Insufficient SOL balance. Required: ${listingPrice} SOL, Available: ${buyerBalanceSOL} SOL`
                );
            }

            // Execute purchase (this will be signed by the buyer on the frontend)
            const { purchase, response } = await metaplex.auctionHouse().buy({
                auctionHouse,
                listing,
                buyer: buyerPublicKey,
            });

            console.log('✅ Purchase prepared successfully!');
            console.log('NFT Address:', nftMintAddress);

            return {
                purchaseAddress: (purchase as any).receiptAddress?.toBase58() || 'purchase-receipt',
                nftAddress: nftMintAddress,
                transaction: response.signature,
            };
        } catch (error) {
            console.error('❌ Error preparing purchase:', error);
            throw new Error(`Failed to prepare purchase: ${(error as Error).message}`);
        }
    }

    /**
     * Cancel listing on marketplace
     * Note: This requires the seller to sign the transaction
     */
    async cancelListing(
        auctionHouseAddress: string,
        listingAddress: string,
        sellerPublicKey: PublicKey
    ): Promise<{ cancelled: boolean; transaction: string }> {
        try {
            console.log('🚫 Cancelling listing...');
            console.log('Auction House:', auctionHouseAddress);
            console.log('Listing:', listingAddress);

            const metaplex = this.solanaService.getMetaplex();

            // Get Auction House model
            const auctionHouse = await metaplex.auctionHouse().findByAddress({
                address: new PublicKey(auctionHouseAddress),
            });

            // Find the listing
            const lazyListing = await metaplex.auctionHouse().findListingByTradeState({
                auctionHouse,
                tradeStateAddress: new PublicKey(listingAddress),
            });

            // Load the full listing
            const listing = (lazyListing as any).model !== 'listing'
                ? await metaplex.auctionHouse().loadListing({ lazyListing } as any)
                : lazyListing;

            // Cancel the listing
            const { response } = await metaplex.auctionHouse().cancelListing({
                auctionHouse,
                listing,
            });

            console.log('✅ Listing cancelled successfully!');

            return {
                cancelled: true,
                transaction: response.signature,
            };
        } catch (error) {
            console.error('❌ Error cancelling listing:', error);
            throw new Error(`Failed to cancel listing: ${(error as Error).message}`);
        }
    }

    /**
     * Get all active listings from marketplace
     */
    async getActiveListings(auctionHouseAddress: string): Promise<any[]> {
        try {
            const metaplex = this.solanaService.getMetaplex();

            // Get Auction House model
            const auctionHouse = await metaplex.auctionHouse().findByAddress({
                address: new PublicKey(auctionHouseAddress),
            });

            const listings = await metaplex.auctionHouse().findListings({
                auctionHouse,
            });

            // Load full listing details for each lazy listing
            const loadedListings = await Promise.all(
                listings.map(async (lazyListing: any) => {
                    try {
                        if (lazyListing.model === 'listing') {
                            return lazyListing;
                        }
                        return await metaplex.auctionHouse().loadListing({ lazyListing } as any);
                    } catch (err) {
                        console.error('Error loading listing:', err);
                        return null;
                    }
                })
            );

            // Filter out null values and map to simplified format
            return loadedListings
                .filter((listing) => listing !== null)
                .map((listing: any) => ({
                    listingAddress: listing.tradeStateAddress.toBase58(),
                    nftAddress:
                        (listing.asset as any)?.address?.toBase58() ||
                        listing.metadataAddress?.toBase58() ||
                        'unknown',
                    price: listing.price.basisPoints.toNumber() / 1e9, // Convert to SOL
                    seller: listing.sellerAddress.toBase58(),
                    createdAt: listing.createdAt || new Date(),
                }));
        } catch (error) {
            console.error('Error getting listings:', error);
            throw new Error(`Failed to get listings: ${(error as Error).message}`);
        }
    }

    /**
     * Get listings for a specific NFT
     */
    async getListingForNFT(
        auctionHouseAddress: string,
        nftMintAddress: string
    ): Promise<any | null> {
        try {
            const allListings = await this.getActiveListings(auctionHouseAddress);
            return allListings.find((listing) => listing.nftAddress === nftMintAddress) || null;
        } catch (error) {
            console.error('Error getting listing for NFT:', error);
            return null;
        }
    }

    /**
     * Validate if an NFT is currently listed
     */
    async isNFTListed(auctionHouseAddress: string, nftMintAddress: string): Promise<boolean> {
        try {
            const listing = await this.getListingForNFT(auctionHouseAddress, nftMintAddress);
            return listing !== null;
        } catch (error) {
            console.error('Error checking if NFT is listed:', error);
            return false;
        }
    }
}

