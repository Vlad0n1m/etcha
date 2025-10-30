import { NextRequest, NextResponse } from 'next/server';
import { SolanaService } from '@/lib/solana/SolanaService';
import { CollectionService } from '@/lib/solana/CollectionService';
import { CandyMachineService } from '@/lib/solana/CandyMachineService';
import Joi from 'joi';

// Lazy initialization to avoid instantiation during build time
function getServices() {
    const solanaService = new SolanaService();
    const collectionService = new CollectionService();
    const candyMachineService = new CandyMachineService(solanaService, collectionService);
    return { solanaService, collectionService, candyMachineService };
}

const validateRequest = Joi.object({
    mintAddress: Joi.string().required(),
    collectionId: Joi.string().required(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { error, value } = validateRequest.validate(body);

        if (error) {
            return NextResponse.json(
                { success: false, error: error.details[0].message },
                { status: 400 }
            );
        }

        const { mintAddress, collectionId } = value;
        const { solanaService, collectionService, candyMachineService } = getServices();

        // Validate mint address
        const isValidMint = await solanaService.isWalletValid(mintAddress);
        if (!isValidMint) {
            return NextResponse.json(
                { success: false, error: 'Invalid mint address' },
                { status: 400 }
            );
        }

        // Get collection
        const collection = await collectionService.getCollectionById(collectionId);
        if (!collection) {
            return NextResponse.json(
                { success: false, error: 'Collection not found' },
                { status: 404 }
            );
        }

        // Validate ticket on blockchain
        const isValid = await candyMachineService.validateTicket(mintAddress, collectionId);

        return NextResponse.json({
            success: true,
            data: {
                mintAddress,
                collectionId,
                isValid,
                collection: {
                    name: collection.name,
                    eventName: collection.eventName,
                    eventDate: collection.eventDate,
                    eventLocation: collection.eventLocation,
                },
            },
            message: isValid ? 'Ticket is valid' : 'Ticket is invalid',
        });
    } catch (error) {
        console.error('Error validating ticket:', error);
        return NextResponse.json(
            { success: false, error: `Failed to validate ticket: ${(error as Error).message}` },
            { status: 500 }
        );
    }
}

