import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ collectionId: string; ticketNumber: string }> }
) {
    try {
        const { collectionId, ticketNumber } = await params;

        const event = await prisma.event.findUnique({
            where: { id: collectionId },
            include: {
                organizer: true,
                category: true,
            },
        });

        if (!event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            );
        }

        // Get base URL for full image path
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const imageUrl = event.imageUrl?.startsWith('http')
            ? event.imageUrl
            : `${baseUrl}${event.imageUrl}`;

        // Return ticket metadata in NFT standard format
        const metadata = {
            name: `${event.title} - Ticket #${ticketNumber}`,
            symbol: 'TICKET',
            description: `Ticket #${ticketNumber} for ${event.title} on ${event.date.toISOString().split('T')[0]}`,
            image: imageUrl,
            external_url: `${baseUrl}/event/${event.id}`,
            attributes: [
                { trait_type: 'Event Name', value: event.title },
                { trait_type: 'Ticket Number', value: ticketNumber },
                { trait_type: 'Date', value: event.date.toISOString().split('T')[0] },
                { trait_type: 'Time', value: event.time },
                { trait_type: 'Location', value: event.fullAddress },
                { trait_type: 'Category', value: event.category.name },
                { trait_type: 'Price', value: `${event.price} SOL` },
            ],
            properties: {
                files: [
                    {
                        uri: imageUrl,
                        type: 'image/jpeg',
                    },
                ],
                category: 'image',
                creators: [
                    {
                        address: event.organizer?.userId || '',
                        verified: true,
                        share: 100,
                    },
                ],
            },
        };

        return NextResponse.json(metadata);
    } catch (error) {
        console.error('Error getting ticket metadata:', error);
        return NextResponse.json(
            { error: 'Failed to get ticket metadata' },
            { status: 500 }
        );
    }
}

