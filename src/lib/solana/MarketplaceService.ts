import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, ComputeBudgetProgram } from '@solana/web3.js';
import { Metaplex, lamports } from '@metaplex-foundation/js';
import { SolanaService } from './SolanaService';
import { BubblegumService } from './BubblegumService';
import { NFTType } from './types';

/**
 * Platform fee configuration
 */
const PLATFORM_FEE_BASIS_POINTS = 250; // 2.5%
const PLATFORM_FEE_PERCENT = PLATFORM_FEE_BASIS_POINTS / 10000;

/**
 * Listing result type
 */
export interface ListingResult {
    listingAddress: string;
    price: number;
    nftType: NFTType;
    transaction?: string;
}

/**
 * Purchase result type
 */
export interface PurchaseResult {
    success: boolean;
    nftType: NFTType;
    purchaseAddress?: string;
    nftAddress?: string;
    assetId?: string;
    transaction: string;
    sellerReceived: number;
    platformFee: number;
}

/**
 * Sale transaction parameters for cNFT
 */
export interface CNFTSaleParams {
    assetId: string;
    sellerWallet: string;
    buyerWallet: string;
    priceInSol: number;
}

/**
 * Marketplace Service for handling NFT secondary sales
 * - Legacy NFTs: Metaplex Auction House
 * - cNFTs: Direct P2P transfers with atomic SOL payment
 * 
 * Platform fee: 2.5% (250 basis points)
 */
export class MarketplaceService {
    private solanaService: SolanaService;
    private bubblegumService: BubblegumService;

    constructor(solanaService: SolanaService) {
        this.solanaService = solanaService;
        this.bubblegumService = new BubblegumService(solanaService);
    }

    /**
     * Get the BubblegumService instance
     */
    getBubblegumService(): BubblegumService {
        return this.bubblegumService;
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
                buyer: buyerPublicKey as any,
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

    // ============================================
    // cNFT P2P MARKETPLACE METHODS
    // ============================================

    /**
     * Build a P2P sale transaction for cNFT
     * Creates an atomic transaction with SOL transfer + cNFT transfer
     * 
     * Transaction flow:
     * 1. Buyer pays SOL to seller (minus platform fee)
     * 2. Buyer pays platform fee
     * 3. Seller transfers cNFT to buyer
     * 
     * @param params - Sale parameters
     * @returns Serialized transaction requiring both buyer and seller signatures
     */
    async buildCNFTSaleTransaction(params: CNFTSaleParams): Promise<{
        transaction: string;
        sellerReceives: number;
        platformFee: number;
    }> {
        console.log('🔄 Building cNFT P2P sale transaction...');
        console.log('Asset ID:', params.assetId);
        console.log('Seller:', params.sellerWallet);
        console.log('Buyer:', params.buyerWallet);
        console.log('Price:', params.priceInSol, 'SOL');

        return this.bubblegumService.buildSaleTransaction({
            assetId: params.assetId,
            seller: params.sellerWallet,
            buyer: params.buyerWallet,
            priceInSol: params.priceInSol,
            platformFeePercent: PLATFORM_FEE_PERCENT * 100,
        });
    }

    /**
     * Execute a cNFT P2P sale (server-side, for trusted operations)
     * Used when both parties have already signed or platform is facilitating
     */
    async executeCNFTSale(params: CNFTSaleParams): Promise<PurchaseResult> {
        console.log('💰 Executing cNFT P2P sale...');

        const platformFee = params.priceInSol * PLATFORM_FEE_PERCENT;
        const sellerReceives = params.priceInSol - platformFee;

        try {
            // Transfer the cNFT from seller to buyer
            const transferResult = await this.bubblegumService.transferCompressedNFT({
                assetId: params.assetId,
                currentOwner: params.sellerWallet,
                newOwner: params.buyerWallet,
            });

            console.log('✅ cNFT P2P sale executed successfully!');

            return {
                success: true,
                nftType: 'cnft',
                assetId: params.assetId,
                transaction: transferResult.signature,
                sellerReceived: sellerReceives,
                platformFee,
            };
        } catch (error) {
            console.error('❌ Error executing cNFT sale:', error);
            throw new Error(`Failed to execute cNFT sale: ${(error as Error).message}`);
        }
    }

    /**
     * Verify ownership of a cNFT before listing
     */
    async verifyCNFTOwnership(assetId: string, expectedOwner: string): Promise<boolean> {
        return this.bubblegumService.verifyOwnership(assetId, expectedOwner);
    }

    /**
     * Get cNFT asset details
     */
    async getCNFTAssetDetails(assetId: string): Promise<{
        owner: string;
        name: string;
        symbol: string;
        uri: string;
        isCompressed: boolean;
    }> {
        const asset = await this.bubblegumService.getAssetFromDAS(assetId);
        return {
            owner: asset.ownership.owner,
            name: asset.content.metadata.name,
            symbol: asset.content.metadata.symbol,
            uri: asset.content.json_uri,
            isCompressed: asset.compression.compressed,
        };
    }

    /**
     * Build a listing creation "transaction" for cNFT
     * Note: cNFT listings are stored off-chain in the database
     * This method just validates ownership and returns listing details
     */
    async prepareCNFTListing(params: {
        assetId: string;
        sellerWallet: string;
        priceInSol: number;
    }): Promise<{
        valid: boolean;
        assetId: string;
        price: number;
        platformFee: number;
        sellerReceives: number;
    }> {
        console.log('📝 Preparing cNFT listing...');
        console.log('Asset ID:', params.assetId);
        console.log('Seller:', params.sellerWallet);
        console.log('Price:', params.priceInSol, 'SOL');

        // Verify ownership
        const isOwner = await this.verifyCNFTOwnership(params.assetId, params.sellerWallet);
        if (!isOwner) {
            throw new Error('Seller does not own this cNFT');
        }

        const platformFee = params.priceInSol * PLATFORM_FEE_PERCENT;
        const sellerReceives = params.priceInSol - platformFee;

        return {
            valid: true,
            assetId: params.assetId,
            price: params.priceInSol,
            platformFee,
            sellerReceives,
        };
    }

    // ============================================
    // UNIFIED MARKETPLACE METHODS
    // ============================================

    /**
     * Prepare a buy transaction based on NFT type
     * Routes to appropriate method (Auction House for legacy, P2P for cNFT)
     */
    async prepareBuyTransaction(params: {
        nftType: NFTType;
        buyerWallet: string;
        priceInSol: number;
        // Legacy params
        auctionHouseAddress?: string;
        listingAddress?: string;
        nftMintAddress?: string;
        // cNFT params
        assetId?: string;
        sellerWallet?: string;
    }): Promise<{
        transaction: string;
        nftType: NFTType;
        sellerReceives: number;
        platformFee: number;
    }> {
        if (params.nftType === 'cnft') {
            if (!params.assetId || !params.sellerWallet) {
                throw new Error('assetId and sellerWallet required for cNFT purchase');
            }

            const result = await this.buildCNFTSaleTransaction({
                assetId: params.assetId,
                sellerWallet: params.sellerWallet,
                buyerWallet: params.buyerWallet,
                priceInSol: params.priceInSol,
            });

            return {
                ...result,
                nftType: 'cnft',
            };
        }

        // Legacy Auction House flow
        if (!params.auctionHouseAddress || !params.listingAddress || !params.nftMintAddress) {
            throw new Error('auctionHouseAddress, listingAddress, and nftMintAddress required for legacy purchase');
        }

        const result = await this.buyTicketFromMarketplace(
            params.auctionHouseAddress,
            params.listingAddress,
            params.nftMintAddress,
            new PublicKey(params.buyerWallet)
        );

        const platformFee = params.priceInSol * PLATFORM_FEE_PERCENT;

        return {
            transaction: result.transaction,
            nftType: 'legacy',
            sellerReceives: params.priceInSol - platformFee,
            platformFee,
        };
    }

    /**
     * Calculate platform fee and seller share
     */
    calculateFees(priceInSol: number): {
        platformFee: number;
        sellerReceives: number;
        platformFeeBasisPoints: number;
    } {
        const platformFee = priceInSol * PLATFORM_FEE_PERCENT;
        return {
            platformFee,
            sellerReceives: priceInSol - platformFee,
            platformFeeBasisPoints: PLATFORM_FEE_BASIS_POINTS,
        };
    }
}

