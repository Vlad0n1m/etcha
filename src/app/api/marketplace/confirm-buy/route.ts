import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const confirmBuySchema = z.object({
    listingId: z.string(),
    buyerWallet: z.string(),
    transactionSignature: z.string(),
});

/**
 * POST /api/marketplace/confirm-buy
 * Confirm marketplace purchase after transaction is signed and sent
 * Updates database records
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { listingId, buyerWallet, transactionSignature } = confirmBuySchema.parse(body);

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

        // Check if listing is still active
        if (listing.status !== 'active') {
            return NextResponse.json(
                {
                    success: false,
                    error: `Listing is ${listing.status} and cannot be purchased`,
                },
                { status: 400 }
            );
        }

        // Verify transaction on blockchain
        const { SolanaService } = await import('@/lib/solana/SolanaService');
        const solanaService = new SolanaService();
        const connection = solanaService.getConnection();

        console.log('🔍 Verifying transaction:', transactionSignature);

        // Wait for transaction confirmation with retries
        let confirmed = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!confirmed && attempts < maxAttempts) {
            try {
                const status = await connection.getSignatureStatus(transactionSignature, {
                    searchTransactionHistory: true,
                });

                if (
                    status?.value?.confirmationStatus === 'confirmed' ||
                    status?.value?.confirmationStatus === 'finalized'
                ) {
                    confirmed = true;
                    console.log('✅ Transaction confirmed on blockchain');
                } else if (status?.value?.err) {
                    throw new Error(`Transaction failed on blockchain: ${JSON.stringify(status.value.err)}`);
                } else {
                    console.log(`⏳ Waiting for confirmation... Attempt ${attempts + 1}/${maxAttempts}`);
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    attempts++;
                }
            } catch (error) {
                console.error('Error checking transaction status:', error);
                attempts++;
                if (attempts >= maxAttempts) {
                    throw new Error('Transaction confirmation timeout');
                }
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }

        if (!confirmed) {
            return NextResponse.json(
                { success: false, error: 'Transaction not confirmed. Please try again.' },
                { status: 400 }
            );
        }

        // Get or create buyer user
        let buyer = await prisma.user.findUnique({
            where: { walletAddress: buyerWallet },
        });

        if (!buyer) {
            buyer = await prisma.user.create({
                data: {
                    walletAddress: buyerWallet,
                },
            });
        }

        // Update listing as sold
        const updatedListing = await prisma.listing.update({
            where: { id: listingId },
            data: {
                status: 'sold',
                soldTo: buyerWallet,
                soldAt: new Date(),
                transactionHash: transactionSignature,
            },
        });

        // Update ticket owner in database (minimal data)
        await prisma.ticket.update({
            where: { nftMintAddress: listing.nftMintAddress },
            data: {
                userId: buyer.id,
            },
        });

        console.log('✅ Purchase completed successfully:', listingId);
        console.log('   Buyer:', buyerWallet);
        console.log('   NFT:', listing.nftMintAddress);
        console.log('   Transaction:', transactionSignature);

        return NextResponse.json({
            success: true,
            data: {
                listing: updatedListing,
                nftAddress: listing.nftMintAddress,
                transactionSignature,
                event: {
                    id: listing.event.id,
                    title: listing.event.title,
                },
                message: 'Purchase completed successfully',
            },
        });
    } catch (error) {
        console.error('❌ Error confirming purchase:', error);
        return NextResponse.json(
            {
                success: false,
                error: `Failed to confirm purchase: ${(error as Error).message}`,
            },
            { status: 500 }
        );
    }
}

