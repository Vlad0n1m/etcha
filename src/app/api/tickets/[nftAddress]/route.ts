import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/tickets/[nftAddress]
 * Get ticket information by NFT mint address
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ nftAddress: string }> }
) {
    try {
        const { nftAddress } = await params;

        if (!nftAddress) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'NFT address is required',
                },
                { status: 400 }
            );
        }

        // Find ticket by NFT mint address
        const ticket = await prisma.ticket.findUnique({
            where: {
                nftMintAddress: nftAddress,
            },
            include: {
                event: {
                    include: {
                        category: true,
                        organizer: true,
                    },
                },
                user: {
                    select: {
                        walletAddress: true,
                    },
                },
            },
        });

        if (!ticket) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Ticket not found',
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                id: ticket.id,
                nftMintAddress: ticket.nftMintAddress,
                tokenId: ticket.tokenId,
                isValid: ticket.isValid,
                isUsed: ticket.isUsed,
                metadataUri: ticket.metadataUri,
                ownerWallet: ticket.user.walletAddress,
                eventId: ticket.eventId,
                event: {
                    id: ticket.event.id,
                    title: ticket.event.title,
                    description: ticket.event.description,
                    price: ticket.event.price,
                    date: ticket.event.date.toISOString(),
                    time: ticket.event.time,
                    location: ticket.event.fullAddress,
                    imageUrl: ticket.event.imageUrl,
                    category: {
                        name: ticket.event.category.name,
                        value: ticket.event.category.value,
                    },
                    organizer: ticket.event.organizer
                        ? {
                            name: ticket.event.organizer.companyName,
                            avatar: ticket.event.organizer.avatar,
                        }
                        : null,
                },
            },
        });
    } catch (error) {
        console.error('Error fetching ticket:', error);
        return NextResponse.json(
            {
                success: false,
                error: `Failed to fetch ticket: ${(error as Error).message}`,
            },
            { status: 500 }
        );
    }
}

