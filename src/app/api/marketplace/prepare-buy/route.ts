import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { NFTType } from '@/lib/solana/types';

const prepareBuySchema = z.object({
    listingId: z.string(),
    buyerWallet: z.string(),
});

/**
 * POST /api/marketplace/prepare-buy
 * Prepare purchase transaction for marketplace listing
 * 
 * Supports both:
 * - Legacy NFT: Auction House transaction
 * - cNFT: P2P transfer with atomic SOL payment (95% cheaper!)
 * 
 * Returns serialized transaction for buyer to sign
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { listingId, buyerWallet } = prepareBuySchema.parse(body);

        // Get listing with event info
        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            include: {
                seller: true,
                event: true,
            },
        });

        if (!listing) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Listing not found',
                },
                { status: 404 }
            );
        }

        // Check if listing is active
        if (listing.status !== 'active') {
            return NextResponse.json(
                {
                    success: false,
                    error: `Listing is ${listing.status} and cannot be purchased`,
                },
                { status: 400 }
            );
        }

        // Check if buyer is trying to buy their own listing
        if (listing.seller.walletAddress === buyerWallet) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'You cannot buy your own listing',
                },
                { status: 400 }
            );
        }

        // Validate buyer wallet
        try {
            new PublicKey(buyerWallet.trim());
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid buyer wallet address' },
                { status: 400 }
            );
        }

        // Determine NFT type
        const nftType = (listing.nftType || listing.event.nftType || 'legacy') as NFTType;

        console.log(`Preparing buy transaction for listing ${listingId} (${nftType})`);

        // Route based on NFT type
        if (nftType === 'cnft') {
            return handleCNFTBuy(listing, buyerWallet);
        }

        // Legacy Auction House flow
        return handleLegacyBuy(listing, buyerWallet);

    } catch (error) {
        console.error('❌ Error preparing purchase:', error);
        return NextResponse.json(
            {
                success: false,
                error: `Failed to prepare purchase: ${(error as Error).message}`,
            },
            { status: 500 }
        );
    }
}

/**
 * Handle cNFT P2P purchase
 * Creates atomic transaction: SOL transfer + cNFT transfer
 */
async function handleCNFTBuy(
    listing: {
        id: string;
        assetId: string | null;
        nftMintAddress: string;
        price: number;
        seller: { walletAddress: string };
        event: { title: string; imageUrl: string };
    },
    buyerWallet: string
) {
    console.log('🌳 Preparing cNFT P2P purchase...');

    const assetId = listing.assetId || listing.nftMintAddress;
    if (!assetId) {
        return NextResponse.json(
            { success: false, error: 'Asset ID not found for cNFT listing' },
            { status: 400 }
        );
    }

    const { SolanaService } = await import('@/lib/solana/SolanaService');
    const { MarketplaceService } = await import('@/lib/solana/MarketplaceService');

    const solanaService = new SolanaService();
    const marketplaceService = new MarketplaceService(solanaService);

    // Check buyer balance
    const buyerBalance = await solanaService.getConnection().getBalance(new PublicKey(buyerWallet));
    const buyerBalanceSOL = buyerBalance / 1e9;

    if (buyerBalanceSOL < listing.price) {
        return NextResponse.json(
            {
                success: false,
                error: `Insufficient SOL balance. Required: ${listing.price} SOL, Available: ${buyerBalanceSOL.toFixed(4)} SOL`,
            },
            { status: 400 }
        );
    }

    // Build P2P sale transaction
    const result = await marketplaceService.buildCNFTSaleTransaction({
        assetId,
        sellerWallet: listing.seller.walletAddress,
        buyerWallet,
        priceInSol: listing.price,
    });

    console.log('✅ cNFT purchase transaction prepared successfully');
    console.log('   Listing ID:', listing.id);
    console.log('   Asset ID:', assetId);
    console.log('   Price:', listing.price, 'SOL');
    console.log('   Seller receives:', result.sellerReceives, 'SOL');
    console.log('   Platform fee:', result.platformFee, 'SOL');

    return NextResponse.json({
        success: true,
        data: {
            transaction: result.transaction,
            nftType: 'cnft',
            listingId: listing.id,
            assetId,
            price: listing.price,
            sellerReceives: result.sellerReceives,
            platformFee: result.platformFee,
            seller: listing.seller.walletAddress,
            event: {
                title: listing.event.title,
                imageUrl: listing.event.imageUrl,
            },
            message: 'cNFT P2P transaction prepared. Please sign with your wallet.',
        },
    });
}

/**
 * Handle legacy Auction House purchase
 */
async function handleLegacyBuy(
    listing: {
        id: string;
        auctionHouseAddress: string | null;
        nftMintAddress: string;
        listingAddress: string;
        price: number;
        seller: { walletAddress: string };
        event: { title: string; imageUrl: string };
    },
    buyerWallet: string
) {
    console.log('🍭 Preparing legacy Auction House purchase...');

    // Validate required fields for legacy
    const validateKey = (key: string | null, field: string) => {
        if (!key) throw new Error(`${field} is required for legacy listing`);
        try {
            new PublicKey(key.trim());
        } catch {
            throw new Error(`${field} is not a valid base58 public key`);
        }
    };

    try {
        validateKey(listing.auctionHouseAddress, 'auctionHouseAddress');
        validateKey(listing.nftMintAddress, 'nftMintAddress');
        validateKey(listing.listingAddress, 'listingAddress');
    } catch (e) {
        return NextResponse.json(
            { success: false, error: (e as Error).message },
            { status: 400 }
        );
    }

    const { SolanaService } = await import('@/lib/solana/SolanaService');

    const solanaService = new SolanaService();
    const buyerPublicKey = new PublicKey(buyerWallet.trim());
    const metaplex = solanaService.getMetaplex();

    // Get Auction House
    const auctionHouse = await metaplex.auctionHouse().findByAddress({
        address: new PublicKey(listing.auctionHouseAddress!.trim()),
    });

    // Load NFT metadata
    const nft = await metaplex.nfts().findByMint({
        mintAddress: new PublicKey(listing.nftMintAddress.trim())
    });

    // Find and load the listing
    const lazyListing = await metaplex.auctionHouse().findListingByTradeState({
        auctionHouse,
        tradeStateAddress: new PublicKey(listing.listingAddress.trim()),
    });

    const fullListing = await metaplex.auctionHouse().loadListing({
        lazyListing,
        loadJsonMetadata: true,
    } as any);

    // Manually attach NFT asset if missing
    if (!(fullListing as { asset?: unknown }).asset) {
        (fullListing as { asset?: unknown }).asset = nft;
    }

    // Check buyer balance
    const buyerBalance = await solanaService.getConnection().getBalance(buyerPublicKey);
    const buyerBalanceSOL = buyerBalance / 1e9;
    const listingPrice = fullListing.price.basisPoints.toNumber() / 1e9;

    if (buyerBalanceSOL < listingPrice) {
        return NextResponse.json(
            {
                success: false,
                error: `Insufficient SOL balance. Required: ${listingPrice} SOL, Available: ${buyerBalanceSOL.toFixed(4)} SOL`,
            },
            { status: 400 }
        );
    }

    // Build buy transaction
    const transactionBuilder = await metaplex.auctionHouse().builders().buy({
        auctionHouse,
        listing: fullListing,
        buyer: buyerPublicKey as any,
    });

    const { blockhash, lastValidBlockHeight } = await solanaService.getConnection().getLatestBlockhash();

    const transaction = transactionBuilder.toTransaction({
        blockhash,
        lastValidBlockHeight,
    });

    transaction.feePayer = buyerPublicKey;

    // Platform wallet signs as auction house authority if needed
    const platformKeypair = solanaService.getKeypair();
    const requiresPlatformSig = transaction.signatures.some(
        sig => sig.publicKey.equals(platformKeypair.publicKey)
    );

    if (requiresPlatformSig) {
        transaction.partialSign(platformKeypair);
        console.log('🔏 Platform wallet signed as auction house authority');
    }

    const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
    });

    const base64Transaction = Buffer.from(serializedTransaction).toString('base64');

    // Calculate fees
    const platformFee = listingPrice * 0.025;
    const sellerReceives = listingPrice - platformFee;

    console.log('✅ Legacy purchase transaction prepared successfully');
    console.log('   Listing ID:', listing.id);
    console.log('   NFT:', listing.nftMintAddress);
    console.log('   Price:', listingPrice, 'SOL');

    return NextResponse.json({
        success: true,
        data: {
            transaction: base64Transaction,
            nftType: 'legacy',
            listingId: listing.id,
            nftMintAddress: listing.nftMintAddress,
            price: listingPrice,
            sellerReceives,
            platformFee,
            seller: listing.seller.walletAddress,
            event: {
                title: listing.event.title,
                imageUrl: listing.event.imageUrl,
            },
            message: 'Transaction prepared. Please sign and send from your wallet.',
        },
    });
}

