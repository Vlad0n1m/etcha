import { prisma } from '@/lib/db';
import { Event } from '@/generated/prisma';
import { SolanaCollection, eventToCollection } from './adapters';

export class CollectionService {
    async createCollection(event: Event, organizerWallet?: string, organizerName?: string): Promise<SolanaCollection> {
        return eventToCollection(event, organizerWallet, organizerName);
    }

    async getCollections(): Promise<SolanaCollection[]> {
        const events = await prisma.event.findMany({
            include: {
                organizer: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        return events.map(event =>
            eventToCollection(
                event,
                event.organizer?.user?.walletAddress || undefined,
                event.organizer?.companyName || undefined
            )
        );
    }

    async getCollectionById(id: string): Promise<SolanaCollection | null> {
        const event = await prisma.event.findUnique({
            where: { id },
            include: {
                organizer: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        if (!event) return null;

        return eventToCollection(
            event,
            event.organizer?.user?.walletAddress || undefined,
            event.organizer?.companyName || undefined
        );
    }

    async updateCollection(id: string, updates: Partial<{ collectionNftAddress: string; candyMachineAddress: string }>): Promise<SolanaCollection | null> {
        const event = await prisma.event.update({
            where: { id },
            data: updates,
            include: {
                organizer: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        return eventToCollection(
            event,
            event.organizer?.user?.walletAddress || undefined,
            event.organizer?.companyName || undefined
        );
    }

    async deleteCollection(id: string): Promise<boolean> {
        try {
            await prisma.event.delete({
                where: { id },
            });
            return true;
        } catch {
            return false;
        }
    }
}

