import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const prepareBuySchema = z.object({
    listingId: z.string(),
    buyerWallet: z.string(),
});

/**
 * POST /api/marketplace/prepare-buy
 * Prepare purchase transaction for marketplace listing
 * Returns serialized transaction for buyer to sign
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { listingId, buyerWallet } = prepareBuySchema.parse(body);

        // Get listing
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

        // Validate all public key strings before using them
        const validateKey = (key: string, field: string) => {
            try {
                // Also trim to avoid accidental whitespace
                // eslint-disable-next-line no-new
                new PublicKey(key.trim());
            } catch {
                throw new Error(`${field} is not a valid base58 public key`);
            }
        };

        try {
            validateKey(buyerWallet, 'buyerWallet');
            validateKey(listing.auctionHouseAddress, 'auctionHouseAddress');
            validateKey(listing.nftMintAddress, 'nftMintAddress');
            validateKey(listing.listingAddress, 'listingAddress');
        } catch (e) {
            return NextResponse.json(
                {
                    success: false,
                    error: (e as Error).message,
                },
                { status: 400 }
            );
        }

        // Prepare purchase transaction
        const { SolanaService } = await import('@/lib/solana/SolanaService');
        const { MarketplaceService } = await import('@/lib/solana/MarketplaceService');

        const solanaService = new SolanaService();
        const marketplaceService = new MarketplaceService(solanaService);

        const buyerPublicKey = new PublicKey(buyerWallet.trim());

        // Prepare the purchase transaction (builder pattern)
        const metaplex = solanaService.getMetaplex();

        // Get Auction House
        const auctionHouse = await metaplex.auctionHouse().findByAddress({
            address: new PublicKey(listing.auctionHouseAddress.trim()),
        });

        // Load NFT metadata
        const nft = await metaplex.nfts().findByMint({
            mintAddress: new PublicKey(listing.nftMintAddress.trim())
        });

        // Find the listing
        const lazyListing = await metaplex.auctionHouse().findListingByTradeState({
            auctionHouse,
            tradeStateAddress: new PublicKey(listing.listingAddress.trim()),
        });

        // Load full listing
        const fullListing = await metaplex.auctionHouse().loadListing({
            lazyListing,
            loadJsonMetadata: true,
        } as any);

        // Manually attach NFT asset if missing
        if (!(fullListing as any).asset) {
            (fullListing as any).asset = nft;
        }

        // Check buyer balance
        const buyerBalance = await solanaService.getConnection().getBalance(buyerPublicKey);
        const buyerBalanceSOL = buyerBalance / 1e9;
        const listingPrice = fullListing.price.basisPoints.toNumber() / 1e9;

        if (buyerBalanceSOL < listingPrice) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Insufficient SOL balance. Required: ${listingPrice} SOL, Available: ${buyerBalanceSOL} SOL`,
                },
                { status: 400 }
            );
        }

        // Build buy transaction
        const transactionBuilder = await metaplex.auctionHouse().builders().buy({
            auctionHouse,
            listing: fullListing,
            buyer: buyerPublicKey,
        });

        // Get latest blockhash
        const { blockhash, lastValidBlockHeight } = await solanaService.getConnection().getLatestBlockhash();

        // Build transaction
        const transaction = transactionBuilder.toTransaction({
            blockhash,
            lastValidBlockHeight,
        });

        // Set fee payer to buyer
        transaction.feePayer = buyerPublicKey;

        // Platform wallet signs as auction house authority if needed
        const platformKeypair = solanaService.getKeypair();

        // Check if platform signature is required (for auction house authority)
        const requiresPlatformSig = transaction.signatures.some(
            sig => sig.publicKey.equals(platformKeypair.publicKey)
        );

        if (requiresPlatformSig) {
            transaction.partialSign(platformKeypair);
            console.log('🔏 Platform wallet signed as auction house authority');
        }

        // Serialize transaction (may be partially signed)
        const serializedTransaction = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        });

        const base64Transaction = Buffer.from(serializedTransaction).toString('base64');

        console.log('✅ Purchase transaction prepared successfully');
        console.log('   Listing ID:', listingId);
        console.log('   NFT:', listing.nftMintAddress);
        console.log('   Price:', listingPrice, 'SOL');
        console.log('   Buyer:', buyerWallet);

        return NextResponse.json({
            success: true,
            data: {
                transaction: base64Transaction,
                listingId,
                nftMintAddress: listing.nftMintAddress,
                price: listingPrice,
                seller: listing.seller.walletAddress,
                event: {
                    title: listing.event.title,
                    imageUrl: listing.event.imageUrl,
                },
                message: 'Transaction prepared. Please sign and send the transaction from your wallet.',
            },
        });
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

