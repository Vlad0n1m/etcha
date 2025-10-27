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

