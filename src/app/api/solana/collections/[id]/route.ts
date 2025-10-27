import { NextRequest, NextResponse } from 'next/server';
import { SolanaService } from '@/lib/solana/SolanaService';
import { CollectionService } from '@/lib/solana/CollectionService';
import { CandyMachineService } from '@/lib/solana/CandyMachineService';

const solanaService = new SolanaService();
const collectionService = new CollectionService();
const candyMachineService = new CandyMachineService(solanaService, collectionService);

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const collection = await collectionService.getCollectionById(id);

        if (!collection) {
            return NextResponse.json(
                { success: false, error: 'Collection not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: collection,
        });
    } catch (error) {
        console.error('Error getting collection:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get collection' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const updates = await request.json();

        const collection = await collectionService.updateCollection(id, updates);

        if (!collection) {
            return NextResponse.json(
                { success: false, error: 'Collection not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: collection,
            message: 'Collection updated successfully',
        });
    } catch (error) {
        console.error('Error updating collection:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update collection' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const deleted = await collectionService.deleteCollection(id);

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: 'Collection not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Collection deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting collection:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete collection' },
            { status: 500 }
        );
    }
}

