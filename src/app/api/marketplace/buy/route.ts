import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/marketplace/buy
 * DEPRECATED: Use /api/marketplace/prepare-buy and /api/marketplace/confirm-buy instead
 * 
 * This endpoint is kept for backward compatibility but redirects to new flow
 */
export async function POST(req: NextRequest) {
    return NextResponse.json(
        {
            success: false,
            error: 'This endpoint is deprecated. Please use /api/marketplace/prepare-buy to get transaction, sign it with your wallet, and then call /api/marketplace/confirm-buy with the signature.',
            migration: {
                step1: 'POST /api/marketplace/prepare-buy with { listingId, buyerWallet }',
                step2: 'Sign the returned transaction with your wallet',
                step3: 'POST /api/marketplace/confirm-buy with { listingId, buyerWallet, transactionSignature }',
            },
        },
        { status: 410 } // 410 Gone - endpoint no longer available
    );
}

