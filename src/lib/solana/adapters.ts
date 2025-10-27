import { Event } from '@/generated/prisma';

// Adapter to convert Prisma Event to Solana Collection format
export interface SolanaCollection {
    id: string;
    eventCreator: string;
    eventCreatorWallet: string; // Wallet address for payment destination
    eventCreatorName: string;
    name: string;
    description: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
    ticketPrice: number;
    maxTickets: number;
    ticketsSold: number;
    imageUrl: string;
    collectionNftAddress?: string;
    candyMachineAddress?: string;
    status: 'active' | 'inactive' | 'completed';
    createdAt: string;
    updatedAt: string;
}

export function eventToCollection(event: Event & { organizer?: { userId?: string; companyName?: string } | null }, organizerWallet?: string, organizerName?: string): SolanaCollection {
    const now = new Date().toISOString();

    if (!organizerWallet) {
        throw new Error('Organizer wallet address is required for collection creation');
    }

    return {
        id: event.id,
        eventCreator: event.organizer?.userId || '',
        eventCreatorWallet: organizerWallet, // Wallet address for payments
        eventCreatorName: organizerName || event.organizer?.companyName || '',
        name: event.title,
        description: event.description,
        eventName: event.title,
        eventDate: event.date.toISOString().split('T')[0],
        eventLocation: event.fullAddress,
        ticketPrice: typeof event.price === 'number' ? event.price : 0,
        maxTickets: event.ticketsAvailable,
        ticketsSold: event.ticketsSold,
        imageUrl: event.imageUrl,
        collectionNftAddress: event.collectionNftAddress || undefined,
        candyMachineAddress: event.candyMachineAddress || undefined,
        status: event.isActive ? 'active' : 'inactive',
        createdAt: event.createdAt?.toISOString() || now,
        updatedAt: event.updatedAt?.toISOString() || now,
    };
}

export function getMetadataUri(eventId: string, baseUrl?: string): string {
    const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${base}/api/metadata/${eventId}`;
}

export function getTicketMetadataUri(eventId: string, ticketNumber: string, baseUrl?: string): string {
    const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${base}/api/metadata/ticket/${eventId}/${ticketNumber}`;
}

