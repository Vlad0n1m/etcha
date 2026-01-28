// Types for Solana NFT operations
// These complement Prisma generated types

export interface TestWallet {
    name: string;
    wallet: string;
    privateKey: number[];
}

export interface MintTicketRequest {
    collectionId: string;
    userWallet: string;
    quantity?: number;
}

export interface MintTicketResponse {
    success: boolean;
    ticketNftAddresses: string[];
    transactionSignature: string;
    ticketNumbers: string[];
    error?: string;
}

export interface MintingRecord {
    id: string;
    collectionId: string;
    userWallet: string;
    ticketNftAddresses: string[];
    ticketNumbers: string[];
    transactionSignature: string;
    amountPaid: number;
    quantity: number;
    mintedAt: string;
    status: 'success' | 'failed';
}

export interface TicketMetadata {
    name: string;
    description: string;
    image: string;
    attributes: Array<{
        trait_type: string;
        value: string;
    }>;
    properties: {
        creators: Array<{
            address: string;
            verified: boolean;
            share: number;
        }>;
    };
}

export interface ListTicketRequest {
    nftMintAddress: string;
    priceInSol: number;
    userWallet: string;
    auctionHouseAddress: string;
}

export interface ListTicketResponse {
    listingAddress: string;
    price: number;
}

export interface BuyTicketRequest {
    listingAddress: string;
    userWallet: string;
    auctionHouseAddress: string;
}

export interface BuyTicketResponse {
    purchaseAddress: string;
    nftAddress: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// NFT Types - all new events use cNFT, legacy kept for backward compatibility
export type NFTType = 'cnft' | 'legacy';

// cNFT specific types
export interface CNFTMintRequest {
    eventId: string;
    userWallet: string;
    quantity?: number;
}

export interface CNFTMintResponse {
    success: boolean;
    assetIds: string[];
    leafIndices: number[];
    transactionSignature: string;
    nftType: 'cnft';
    error?: string;
}

export interface CNFTListingRequest {
    assetId: string;
    priceInSol: number;
    sellerWallet: string;
    eventId: string;
}

export interface CNFTListingResponse {
    listingId: string;
    assetId: string;
    price: number;
    nftType: 'cnft';
}

export interface CNFTBuyRequest {
    listingId: string;
    buyerWallet: string;
}

export interface CNFTBuyResponse {
    success: boolean;
    assetId: string;
    transactionSignature: string;
    nftType: 'cnft';
}

// Unified ticket representation (works for both legacy and cNFT)
export interface UnifiedTicket {
    id: string;
    eventId: string;
    userId: string;
    tokenId: number;
    isValid: boolean;
    isUsed: boolean;
    createdAt: Date;

    // Legacy NFT fields
    nftMintAddress?: string;
    metadataUri?: string;

    // cNFT specific fields
    assetId?: string;
    leafIndex?: number;
    dataHash?: string;
    creatorHash?: string;

    // Type discriminator
    nftType: NFTType;
}

// Unified listing representation
export interface UnifiedListing {
    id: string;
    eventId: string;
    sellerId: string;
    price: number;
    originalPrice: number;
    status: 'active' | 'sold' | 'cancelled';
    createdAt: Date;

    // Legacy fields
    nftMintAddress?: string;
    listingAddress?: string;
    auctionHouseAddress?: string;

    // cNFT fields
    assetId?: string;

    // Type discriminator
    nftType: NFTType;
}

// Merkle tree configuration
export interface MerkleTreeConfig {
    maxDepth: number;
    maxBufferSize: number;
    capacity: number;
}

export const MERKLE_TREE_PRESETS: Record<string, MerkleTreeConfig> = {
    SMALL: { maxDepth: 14, maxBufferSize: 64, capacity: 16_384 },
    MEDIUM: { maxDepth: 17, maxBufferSize: 64, capacity: 131_072 },
    LARGE: { maxDepth: 20, maxBufferSize: 256, capacity: 1_048_576 },
};

