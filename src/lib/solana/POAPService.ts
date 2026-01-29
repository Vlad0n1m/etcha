/**
 * POAPService - Proof of Attendance Protocol Service
 * 
 * Handles minting POAP badges as cNFTs when tickets are scanned at events.
 * Uses shared platform-wide Merkle Tree for cost efficiency.
 * 
 * Cost: ~0.0003 SOL per POAP (instead of ~0.1 SOL per event for dedicated tree)
 */

import { BubblegumService, CNFTMetadata } from './BubblegumService';
import { SolanaService } from './SolanaService';
import { getPlatformTreeService, PlatformTreeService } from './PlatformTreeService';
import { prisma } from '@/lib/db';

/**
 * POAP badge metadata template
 */
export interface POAPMetadata {
    eventId: string;
    eventTitle: string;
    eventDate: Date;
    eventLocation: string;
    attendeeWallet: string;
    ticketId: string;
}

/**
 * Result of minting a POAP badge
 */
export interface MintPOAPResult {
    success: boolean;
    assetId?: string;
    leafIndex?: number;
    signature?: string;
    error?: string;
}

/**
 * POAPService - Manages Proof of Attendance badges using shared platform tree
 */
export class POAPService {
    private bubblegumService: BubblegumService;
    private solanaService: SolanaService;
    private platformTreeService: PlatformTreeService;

    constructor(solanaService: SolanaService) {
        this.solanaService = solanaService;
        this.bubblegumService = new BubblegumService(solanaService);
        this.platformTreeService = getPlatformTreeService();
    }

    /**
     * Mint a POAP badge for an attendee using shared platform tree
     * Called when a ticket is scanned at an event
     * 
     * @param params - Attendance and event details
     * @returns Mint result with asset ID
     */
    async mintPOAPBadge(params: {
        eventId: string;
        attendanceId: string;
        recipientWallet: string;
    }): Promise<MintPOAPResult> {
        console.log(`Minting POAP badge for attendance: ${params.attendanceId}`);

        try {
            // Get event details for metadata
            const event = await prisma.event.findUnique({
                where: { id: params.eventId },
                select: {
                    id: true,
                    title: true,
                    date: true,
                    fullAddress: true,
                    imageUrl: true,
                },
            });

            if (!event) {
                return { success: false, error: 'Event not found' };
            }

            // Get active POAP tree from platform
            const poapTree = await this.platformTreeService.getActiveTree('poap');

            if (!poapTree.collectionAddress) {
                return { success: false, error: 'POAP collection not initialized' };
            }

            // Build POAP metadata URI
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const metadataUri = `${baseUrl}/api/metadata/poap/${event.id}`;

            // Build POAP metadata
            const metadata: CNFTMetadata = {
                name: `${event.title} - Attended`,
                symbol: 'POAP',
                uri: metadataUri,
                sellerFeeBasisPoints: 0, // POAP badges are non-transferable conceptually
                creators: [{
                    address: this.solanaService.getKeypair().publicKey.toString(),
                    share: 100,
                    verified: true,
                }],
            };

            // Mint POAP cNFT using shared platform tree
            const mintResult = await this.bubblegumService.mintCompressedNFT({
                merkleTree: poapTree.address,
                collectionMint: poapTree.collectionAddress,
                metadata,
                recipient: params.recipientWallet,
            });

            // Increment minted count in platform tree
            await this.platformTreeService.incrementMintedCount(poapTree.id);

            console.log('POAP badge minted successfully:', mintResult.assetId);

            return {
                success: true,
                assetId: mintResult.assetId,
                leafIndex: mintResult.leafIndex,
                signature: mintResult.signature,
            };
        } catch (error) {
            console.error('Failed to mint POAP badge:', error);
            return {
                success: false,
                error: (error as Error).message,
            };
        }
    }

    /**
     * Mint POAP badge asynchronously and update attendance record
     * This is the main method to call after scanning a ticket
     * 
     * @param attendanceId - The attendance record ID
     */
    async mintPOAPAsync(attendanceId: string): Promise<void> {
        console.log(`Starting async POAP mint for attendance: ${attendanceId}`);

        try {
            // Get attendance with related data
            const attendance = await prisma.attendance.findUnique({
                where: { id: attendanceId },
                include: {
                    ticket: {
                        include: {
                            user: {
                                select: {
                                    walletAddress: true,
                                    internalWalletAddress: true,
                                },
                            },
                        },
                    },
                    event: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            });

            if (!attendance) {
                console.error('Attendance not found:', attendanceId);
                return;
            }

            // Determine recipient wallet (prefer external, fallback to internal)
            const recipientWallet = attendance.ticket.user.walletAddress ||
                attendance.ticket.user.internalWalletAddress;

            if (!recipientWallet) {
                await prisma.attendance.update({
                    where: { id: attendanceId },
                    data: {
                        poapStatus: 'failed',
                    },
                });
                console.error('No wallet address found for user');
                return;
            }

            // Mint the POAP badge using shared platform tree
            const result = await this.mintPOAPBadge({
                eventId: attendance.eventId,
                attendanceId,
                recipientWallet,
            });

            if (result.success && result.assetId) {
                // Update attendance with POAP details
                await prisma.attendance.update({
                    where: { id: attendanceId },
                    data: {
                        poapAssetId: result.assetId,
                        poapLeafIndex: result.leafIndex,
                        poapMintTx: result.signature,
                        poapStatus: 'minted',
                    },
                });
                console.log(`POAP badge minted and recorded for attendance: ${attendanceId}`);
            } else {
                await prisma.attendance.update({
                    where: { id: attendanceId },
                    data: {
                        poapStatus: 'failed',
                    },
                });
                console.error(`Failed to mint POAP badge: ${result.error}`);
            }
        } catch (error) {
            console.error('Error in async POAP mint:', error);
            try {
                await prisma.attendance.update({
                    where: { id: attendanceId },
                    data: {
                        poapStatus: 'failed',
                    },
                });
            } catch {
                // Ignore update errors
            }
        }
    }

    /**
     * Get POAP statistics for an event
     */
    async getPOAPStats(eventId: string): Promise<{
        total: number;
        minted: number;
        pending: number;
        failed: number;
    }> {
        const [total, minted, pending, failed] = await Promise.all([
            prisma.attendance.count({ where: { eventId } }),
            prisma.attendance.count({ where: { eventId, poapStatus: 'minted' } }),
            prisma.attendance.count({ where: { eventId, poapStatus: 'pending' } }),
            prisma.attendance.count({ where: { eventId, poapStatus: 'failed' } }),
        ]);

        return { total, minted, pending, failed };
    }

    /**
     * Check if platform POAP tree is ready
     */
    async isPlatformReady(): Promise<boolean> {
        try {
            const tree = await this.platformTreeService.getActiveTree('poap');
            return !!tree.collectionAddress && tree.available > 0;
        } catch {
            return false;
        }
    }
}

// Singleton instance
let poapServiceInstance: POAPService | null = null;

/**
 * Get or create POAPService instance
 */
export function getPOAPService(): POAPService {
    if (!poapServiceInstance) {
        const solanaService = new SolanaService();
        poapServiceInstance = new POAPService(solanaService);
    }
    return poapServiceInstance;
}
