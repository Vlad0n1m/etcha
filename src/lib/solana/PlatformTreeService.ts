/**
 * PlatformTreeService - Manages shared platform-wide Merkle Trees
 * 
 * Instead of creating a new Merkle Tree for each event (expensive),
 * we use shared trees across all events. This reduces costs from
 * ~0.2 SOL per event to ~0.0006 SOL per ticket.
 * 
 * Architecture:
 * - One LARGE tree for tickets (1M capacity, ~1.5 SOL one-time)
 * - One LARGE tree for POAP badges (1M capacity, ~1.5 SOL one-time)
 * - When a tree fills up, we create a new one automatically
 */

import { prisma } from '@/lib/db';
import { BubblegumService, MerkleTreeSize, MERKLE_TREE_CONFIGS } from './BubblegumService';
import { SolanaService } from './SolanaService';

export type TreeType = 'ticket' | 'poap';

interface ActiveTree {
    id: string;
    address: string;
    collectionAddress: string | null;
    capacity: number;
    minted: number;
    available: number;
}

/**
 * PlatformTreeService - Singleton service for managing shared Merkle Trees
 */
export class PlatformTreeService {
    private bubblegumService: BubblegumService;
    private solanaService: SolanaService;

    // Cache active trees to avoid DB queries on every mint
    private activeTreeCache: Map<TreeType, ActiveTree | null> = new Map();
    private cacheExpiry: Map<TreeType, number> = new Map();
    private readonly CACHE_TTL = 60000; // 1 minute

    constructor(solanaService: SolanaService) {
        this.solanaService = solanaService;
        this.bubblegumService = new BubblegumService(solanaService);
    }

    /**
     * Get or create an active Merkle Tree for the given type
     */
    async getActiveTree(type: TreeType): Promise<ActiveTree> {
        // Check cache first
        const cached = this.activeTreeCache.get(type);
        const expiry = this.cacheExpiry.get(type) || 0;

        if (cached && Date.now() < expiry) {
            // Check if tree still has capacity
            if (cached.available > 0) {
                return cached;
            }
        }

        // Query database for active tree with capacity
        const tree = await prisma.platformMerkleTree.findFirst({
            where: {
                type,
                isActive: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // If tree exists and has capacity, use it
        if (tree && tree.minted < tree.capacity) {
            const activeTree: ActiveTree = {
                id: tree.id,
                address: tree.address,
                collectionAddress: tree.collectionAddress,
                capacity: tree.capacity,
                minted: tree.minted,
                available: tree.capacity - tree.minted,
            };

            this.activeTreeCache.set(type, activeTree);
            this.cacheExpiry.set(type, Date.now() + this.CACHE_TTL);

            return activeTree;
        }

        // Need to create a new tree
        console.log(`Creating new platform ${type} Merkle Tree...`);
        return await this.createNewTree(type);
    }

    /**
     * Create a new platform Merkle Tree
     */
    private async createNewTree(type: TreeType): Promise<ActiveTree> {
        // Use LARGE tree for maximum capacity (1M NFTs)
        const treeSize: MerkleTreeSize = 'LARGE';
        const config = MERKLE_TREE_CONFIGS[treeSize];

        // Create the Merkle Tree on-chain
        const treeResult = await this.bubblegumService.createMerkleTree(treeSize);
        console.log(`Created ${type} Merkle Tree: ${treeResult.merkleTreeAddress}`);

        // Create collection NFT for this tree
        const collectionResult = await this.bubblegumService.createCollectionNFT({
            name: type === 'ticket' ? 'Etcha Event Tickets' : 'Etcha POAP Badges',
            symbol: type === 'ticket' ? 'ETCHA' : 'POAP',
            uri: type === 'ticket'
                ? `${process.env.NEXT_PUBLIC_APP_URL}/api/metadata/platform/tickets`
                : `${process.env.NEXT_PUBLIC_APP_URL}/api/metadata/platform/poap`,
            sellerFeeBasisPoints: 250, // 2.5% royalty
        });
        console.log(`Created ${type} Collection: ${collectionResult.collectionAddress}`);

        // Save to database
        const newTree = await prisma.platformMerkleTree.create({
            data: {
                address: treeResult.merkleTreeAddress,
                type,
                maxDepth: config.maxDepth,
                capacity: config.capacity,
                minted: 0,
                isActive: true,
                collectionAddress: collectionResult.collectionAddress,
            },
        });

        // Mark old trees as inactive
        await prisma.platformMerkleTree.updateMany({
            where: {
                type,
                id: { not: newTree.id },
                isActive: true,
            },
            data: {
                isActive: false,
            },
        });

        const activeTree: ActiveTree = {
            id: newTree.id,
            address: newTree.address,
            collectionAddress: newTree.collectionAddress,
            capacity: newTree.capacity,
            minted: newTree.minted,
            available: newTree.capacity - newTree.minted,
        };

        this.activeTreeCache.set(type, activeTree);
        this.cacheExpiry.set(type, Date.now() + this.CACHE_TTL);

        return activeTree;
    }

    /**
     * Increment minted count for a tree
     */
    async incrementMintedCount(treeId: string, count: number = 1): Promise<void> {
        await prisma.platformMerkleTree.update({
            where: { id: treeId },
            data: {
                minted: { increment: count },
            },
        });

        // Invalidate cache
        for (const [type, cached] of this.activeTreeCache.entries()) {
            if (cached?.id === treeId) {
                this.cacheExpiry.set(type, 0);
            }
        }
    }

    /**
     * Get tree statistics
     */
    async getTreeStats(): Promise<{
        ticket: { total: number; used: number; available: number; trees: number };
        poap: { total: number; used: number; available: number; trees: number };
    }> {
        const [ticketTrees, poapTrees] = await Promise.all([
            prisma.platformMerkleTree.findMany({ where: { type: 'ticket' } }),
            prisma.platformMerkleTree.findMany({ where: { type: 'poap' } }),
        ]);

        const ticketStats = ticketTrees.reduce(
            (acc, tree) => ({
                total: acc.total + tree.capacity,
                used: acc.used + tree.minted,
                available: acc.available + (tree.isActive ? tree.capacity - tree.minted : 0),
                trees: acc.trees + 1,
            }),
            { total: 0, used: 0, available: 0, trees: 0 }
        );

        const poapStats = poapTrees.reduce(
            (acc, tree) => ({
                total: acc.total + tree.capacity,
                used: acc.used + tree.minted,
                available: acc.available + (tree.isActive ? tree.capacity - tree.minted : 0),
                trees: acc.trees + 1,
            }),
            { total: 0, used: 0, available: 0, trees: 0 }
        );

        return { ticket: ticketStats, poap: poapStats };
    }

    /**
     * Check if platform trees are initialized
     */
    async isInitialized(): Promise<boolean> {
        const count = await prisma.platformMerkleTree.count({
            where: { isActive: true },
        });
        return count >= 2; // At least one ticket tree and one POAP tree
    }

    /**
     * Initialize platform trees if not already done
     * This should be called once during platform setup
     */
    async initializeIfNeeded(): Promise<void> {
        const [ticketTree, poapTree] = await Promise.all([
            prisma.platformMerkleTree.findFirst({
                where: { type: 'ticket', isActive: true },
            }),
            prisma.platformMerkleTree.findFirst({
                where: { type: 'poap', isActive: true },
            }),
        ]);

        if (!ticketTree) {
            console.log('Initializing platform ticket Merkle Tree...');
            await this.createNewTree('ticket');
        }

        if (!poapTree) {
            console.log('Initializing platform POAP Merkle Tree...');
            await this.createNewTree('poap');
        }
    }
}

// Singleton instance
let platformTreeServiceInstance: PlatformTreeService | null = null;

/**
 * Get or create PlatformTreeService instance
 */
export function getPlatformTreeService(): PlatformTreeService {
    if (!platformTreeServiceInstance) {
        const solanaService = new SolanaService();
        platformTreeServiceInstance = new PlatformTreeService(solanaService);
    }
    return platformTreeServiceInstance;
}
