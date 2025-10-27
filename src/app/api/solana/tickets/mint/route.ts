import { NextRequest, NextResponse } from 'next/server';
import { SolanaService } from '@/lib/solana/SolanaService';
import { CollectionService } from '@/lib/solana/CollectionService';
import { CandyMachineService } from '@/lib/solana/CandyMachineService';
import Joi from 'joi';

const solanaService = new SolanaService();
const collectionService = new CollectionService();
const candyMachineService = new CandyMachineService(solanaService, collectionService);

const validateMintTicket = Joi.object({
    collectionId: Joi.string().required(),
    userWallet: Joi.string().required(),
    quantity: Joi.number().integer().min(1).max(10).default(1),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { error, value } = validateMintTicket.validate(body);

        if (error) {
            return NextResponse.json(
                { success: false, error: error.details[0].message },
                { status: 400 }
            );
        }

        const { collectionId, userWallet, quantity } = value;

        // Validate wallet address
        const isValidWallet = await solanaService.isWalletValid(userWallet);
        if (!isValidWallet) {
            return NextResponse.json(
                { success: false, error: 'Invalid wallet address' },
                { status: 400 }
            );
        }

        // Check if collection exists
        const collection = await collectionService.getCollectionById(collectionId);
        if (!collection) {
            return NextResponse.json(
                { success: false, error: 'Collection not found' },
                { status: 404 }
            );
        }

        // Mint tickets
        const mintResult = await candyMachineService.mintTicket(collectionId, userWallet, quantity);

        return NextResponse.json({
            success: true,
            data: {
                ticketNftAddresses: mintResult.nftAddresses,
                transactionSignature: mintResult.transactionSignature,
                ticketNumbers: mintResult.ticketNumbers,
            },
            message: `${quantity} ticket(s) minted successfully`,
        });
    } catch (error) {
        console.error('Error minting ticket:', error);
        return NextResponse.json(
            { success: false, error: `Failed to mint ticket: ${(error as Error).message}` },
            { status: 500 }
        );
    }
}

