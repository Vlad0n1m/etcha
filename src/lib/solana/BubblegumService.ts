/**
 * BubblegumService - Compressed NFT (cNFT) operations using Metaplex Bubblegum
 * 
 * Provides cost-effective NFT minting at ~98% lower cost than traditional NFTs.
 * Uses Merkle trees for state compression, reducing on-chain storage costs.
 * 
 * Cost comparison:
 * - Traditional NFT mint: ~0.015 SOL
 * - Compressed NFT mint: ~0.0003 SOL
 */

import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    TransactionInstruction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    sendAndConfirmTransaction,
    ComputeBudgetProgram,
} from '@solana/web3.js';
import {
    createTree,
    mintV1,
    mplBubblegum,
    transfer,
    getAssetWithProof,
    findLeafAssetIdPda,
    MPL_BUBBLEGUM_PROGRAM_ID,
} from '@metaplex-foundation/mpl-bubblegum';

/**
 * Tree configuration data (simplified from Bubblegum's TreeConfig)
 */
interface TreeConfigData {
    treeCreator: string;
    treeDelegate: string;
    totalMintCapacity: bigint;
    numMinted: bigint;
    isPublic: boolean;
    isDecompressible: number;
}
import {
    createUmi,
} from '@metaplex-foundation/umi-bundle-defaults';
import {
    Umi,
    publicKey,
    keypairIdentity,
    generateSigner,
    createSignerFromKeypair,
    signerIdentity,
    Signer,
    PublicKey as UmiPublicKey,
    transactionBuilder,
    TransactionBuilder,
} from '@metaplex-foundation/umi';
import {
    createNft,
    mplTokenMetadata,
} from '@metaplex-foundation/mpl-token-metadata';
import { SolanaService } from './SolanaService';

/**
 * Merkle tree depth configurations and their capacities
 */
export const MERKLE_TREE_CONFIGS = {
    SMALL: { maxDepth: 14, maxBufferSize: 64, capacity: 16_384 },     // ~16K tickets, ~0.1 SOL
    MEDIUM: { maxDepth: 17, maxBufferSize: 64, capacity: 131_072 },   // ~131K tickets, ~0.5 SOL
    LARGE: { maxDepth: 20, maxBufferSize: 256, capacity: 1_048_576 }, // ~1M tickets, ~1.5 SOL
} as const;

export type MerkleTreeSize = keyof typeof MERKLE_TREE_CONFIGS;

/**
 * NFT metadata for compressed NFT
 */
export interface CNFTMetadata {
    name: string;
    symbol: string;
    uri: string;
    sellerFeeBasisPoints: number;
    creators?: {
        address: string;
        share: number;
        verified?: boolean;
    }[];
}

/**
 * Result of minting a compressed NFT
 */
export interface MintCNFTResult {
    assetId: string;
    leafIndex: number;
    signature: string;
    dataHash: string;
    creatorHash: string;
}

/**
 * Asset proof for transfers
 */
export interface AssetProof {
    root: Buffer;
    proof: Buffer[];
    nodeIndex: number;
    leaf: Buffer;
    treeId: string;
}

/**
 * Result of creating a Merkle tree
 */
export interface CreateTreeResult {
    merkleTreeAddress: string;
    signature: string;
    maxDepth: number;
    maxBufferSize: number;
    capacity: number;
}

/**
 * Transfer result
 */
export interface TransferResult {
    signature: string;
    newOwner: string;
}

/**
 * DAS API response types
 */
interface DASAsset {
    id: string;
    ownership: {
        owner: string;
        delegate: string | null;
    };
    compression: {
        eligible: boolean;
        compressed: boolean;
        data_hash: string;
        creator_hash: string;
        asset_hash: string;
        tree: string;
        seq: number;
        leaf_id: number;
    };
    content: {
        json_uri: string;
        metadata: {
            name: string;
            symbol: string;
        };
    };
}

interface DASAssetProof {
    root: string;
    proof: string[];
    node_index: number;
    leaf: string;
    tree_id: string;
}

/**
 * BubblegumService - Handles all compressed NFT operations
 */
export class BubblegumService {
    private solanaService: SolanaService;
    private umi: Umi;
    private connection: Connection;
    private platformKeypair: Keypair;
    private dasApiUrl: string;

    constructor(solanaService: SolanaService) {
        this.solanaService = solanaService;
        this.connection = solanaService.getConnection();
        this.platformKeypair = solanaService.getKeypair();

        // Initialize UMI with Bubblegum plugin
        const rpcUrl = solanaService.getConfig().solana.rpcUrl;
        this.umi = createUmi(rpcUrl)
            .use(mplBubblegum())
            .use(mplTokenMetadata());

        // Set platform identity
        const umiKeypair = this.umi.eddsa.createKeypairFromSecretKey(
            this.platformKeypair.secretKey
        );
        const umiSigner = createSignerFromKeypair(this.umi, umiKeypair);
        this.umi.use(signerIdentity(umiSigner));

        // DAS API URL - use Helius or similar provider for production
        // Falls back to standard RPC for devnet (limited DAS support)
        this.dasApiUrl = process.env.HELIUS_RPC_URL ||
            process.env.DAS_API_URL ||
            rpcUrl;

        console.log('BubblegumService initialized with wallet:', this.platformKeypair.publicKey.toString());
    }

    /**
     * Create a new Merkle tree for cNFT minting
     * This should be called once per event/collection
     * 
     * @param size - Tree size configuration (SMALL, MEDIUM, LARGE)
     * @returns Tree creation result with address
     */
    async createMerkleTree(size: MerkleTreeSize = 'SMALL'): Promise<CreateTreeResult> {
        console.log(`Creating Merkle tree with size: ${size}`);

        const config = MERKLE_TREE_CONFIGS[size];
        const { maxDepth, maxBufferSize, capacity } = config;

        // Check balance for tree creation
        const balance = await this.solanaService.getBalance();
        const estimatedCost = this.estimateTreeCreationCost(maxDepth);

        if (balance < estimatedCost) {
            throw new Error(
                `Insufficient balance for tree creation. ` +
                `Required: ~${estimatedCost.toFixed(3)} SOL, Available: ${balance.toFixed(4)} SOL`
            );
        }

        try {
            // Generate a new keypair for the tree
            const merkleTree = generateSigner(this.umi);

            console.log('Creating tree with config:', {
                maxDepth,
                maxBufferSize,
                treeAddress: merkleTree.publicKey,
            });

            // Create the tree using Bubblegum
            const builder = await createTree(this.umi, {
                merkleTree,
                maxDepth,
                maxBufferSize,
                public: false, // Only authority can mint
            });

            const result = await builder.sendAndConfirm(this.umi);
            const signature = Buffer.from(result.signature).toString('base64');

            console.log('Merkle tree created successfully!');
            console.log('Tree Address:', merkleTree.publicKey);
            console.log('Signature:', signature);

            return {
                merkleTreeAddress: merkleTree.publicKey.toString(),
                signature,
                maxDepth,
                maxBufferSize,
                capacity,
            };
        } catch (error) {
            console.error('Failed to create Merkle tree:', error);
            throw new Error(`Failed to create Merkle tree: ${(error as Error).message}`);
        }
    }

    /**
     * Mint a compressed NFT to a recipient
     * 
     * @param params - Minting parameters
     * @returns Mint result with asset ID
     */
    async mintCompressedNFT(params: {
        merkleTree: string;
        collectionMint: string;
        metadata: CNFTMetadata;
        recipient: string;
    }): Promise<MintCNFTResult> {
        console.log('Minting compressed NFT...');
        console.log('Merkle Tree:', params.merkleTree);
        console.log('Recipient:', params.recipient);
        console.log('Metadata:', params.metadata.name);

        try {
            const merkleTreePubkey = publicKey(params.merkleTree);
            const collectionMintPubkey = publicKey(params.collectionMint);
            const recipientPubkey = publicKey(params.recipient);

            // Build creators array for UMI
            const creators = params.metadata.creators?.map(c => ({
                address: publicKey(c.address),
                share: c.share,
                verified: c.verified ?? false,
            })) || [{
                address: publicKey(this.platformKeypair.publicKey.toString()),
                share: 100,
                verified: true,
            }];

            // Mint the compressed NFT
            const builder = await mintV1(this.umi, {
                leafOwner: recipientPubkey,
                merkleTree: merkleTreePubkey,
                metadata: {
                    name: params.metadata.name,
                    symbol: params.metadata.symbol,
                    uri: params.metadata.uri,
                    sellerFeeBasisPoints: params.metadata.sellerFeeBasisPoints,
                    collection: {
                        key: collectionMintPubkey,
                        verified: false, // Will be verified in separate tx if needed
                    },
                    creators,
                    primarySaleHappened: true,
                    isMutable: true,
                    editionNonce: null,
                    tokenStandard: null,
                    uses: null,
                    tokenProgramVersion: null,
                },
            });

            const result = await builder.sendAndConfirm(this.umi);
            const signature = Buffer.from(result.signature).toString('base64');

            // Parse leaf data from transaction to get asset ID
            const leafData = await this.parseLeafFromTransaction(
                params.merkleTree,
                signature
            );

            console.log('Compressed NFT minted successfully!');
            console.log('Asset ID:', leafData.assetId);
            console.log('Leaf Index:', leafData.leafIndex);

            return {
                assetId: leafData.assetId,
                leafIndex: leafData.leafIndex,
                signature,
                dataHash: leafData.dataHash,
                creatorHash: leafData.creatorHash,
            };
        } catch (error) {
            console.error('Failed to mint compressed NFT:', error);
            throw new Error(`Failed to mint compressed NFT: ${(error as Error).message}`);
        }
    }

    /**
     * Build a payment transaction for ticket purchase
     * The cNFT will be minted server-side after payment is confirmed
     * 
     * @param params - Transaction parameters
     * @returns Serialized payment transaction
     */
    async buildMintTransaction(params: {
        merkleTree: string;
        collectionMint: string;
        metadata: CNFTMetadata;
        recipient: string;
        priceInSol: number;
        paymentDestination: string;
    }): Promise<{
        transaction: string;
        expectedAssetId: string;
    }> {
        console.log('Building payment transaction for ticket purchase...');

        const merkleTreePubkey = publicKey(params.merkleTree);

        // Get tree config to determine next leaf index for expected asset ID
        const treeConfig = await this.getTreeConfig(params.merkleTree);
        const expectedLeafIndex = Number(treeConfig.numMinted);

        // Calculate expected asset ID (will be minted after payment confirms)
        const [assetId] = findLeafAssetIdPda(this.umi, {
            merkleTree: merkleTreePubkey,
            leafIndex: expectedLeafIndex,
        });

        // Build payment transaction
        const connection = this.solanaService.getConnection();
        const { blockhash } = await connection.getLatestBlockhash();

        const transaction = new Transaction();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = new PublicKey(params.recipient);

        // Add compute budget
        transaction.add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 50_000 })
        );

        // Calculate payment split: 97.5% to organizer, 2.5% to platform
        const totalLamports = Math.floor(params.priceInSol * LAMPORTS_PER_SOL);
        const platformFeeLamports = Math.floor(totalLamports * 0.025);
        const organizerLamports = totalLamports - platformFeeLamports;

        // Payment to organizer
        transaction.add(
            SystemProgram.transfer({
                fromPubkey: new PublicKey(params.recipient),
                toPubkey: new PublicKey(params.paymentDestination),
                lamports: organizerLamports,
            })
        );

        // Platform fee
        if (platformFeeLamports > 0) {
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: new PublicKey(params.recipient),
                    toPubkey: this.platformKeypair.publicKey,
                    lamports: platformFeeLamports,
                })
            );
        }

        // Serialize for client signing
        const serialized = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        });

        console.log('Payment transaction built successfully');
        console.log('Expected asset ID:', assetId.toString());

        return {
            transaction: serialized.toString('base64'),
            expectedAssetId: assetId.toString(),
        };
    }

    /**
     * Transfer a compressed NFT from one owner to another
     * Used for resale/marketplace transactions
     * 
     * @param params - Transfer parameters
     * @returns Transfer result
     */
    async transferCompressedNFT(params: {
        assetId: string;
        currentOwner: string;
        newOwner: string;
    }): Promise<TransferResult> {
        console.log('Transferring compressed NFT...');
        console.log('Asset ID:', params.assetId);
        console.log('From:', params.currentOwner);
        console.log('To:', params.newOwner);

        try {
            // Get asset with proof from DAS API
            const assetWithProof = await this.getAssetWithProofFromDAS(params.assetId);

            const builder = await transfer(this.umi, {
                ...assetWithProof,
                leafOwner: publicKey(params.currentOwner),
                newLeafOwner: publicKey(params.newOwner),
            });

            const result = await builder.sendAndConfirm(this.umi);
            const signature = Buffer.from(result.signature).toString('base64');

            console.log('Transfer successful!');
            console.log('Signature:', signature);

            return {
                signature,
                newOwner: params.newOwner,
            };
        } catch (error) {
            console.error('Failed to transfer compressed NFT:', error);
            throw new Error(`Failed to transfer compressed NFT: ${(error as Error).message}`);
        }
    }

    /**
     * Build a transfer transaction for P2P sale (SOL + cNFT atomic swap)
     * 
     * @param params - Sale parameters
     * @returns Serialized transaction requiring both buyer and seller signatures
     */
    async buildSaleTransaction(params: {
        assetId: string;
        seller: string;
        buyer: string;
        priceInSol: number;
        platformFeePercent?: number;
    }): Promise<{
        transaction: string;
        sellerReceives: number;
        platformFee: number;
    }> {
        console.log('Building P2P sale transaction...');

        const platformFeePercent = params.platformFeePercent ?? 2.5;
        const platformFee = params.priceInSol * (platformFeePercent / 100);
        const sellerReceives = params.priceInSol - platformFee;

        // Get asset with proof
        const assetWithProof = await this.getAssetWithProofFromDAS(params.assetId);

        // Build transfer instruction using UMI
        const transferBuilder = transfer(this.umi, {
            ...assetWithProof,
            leafOwner: publicKey(params.seller),
            newLeafOwner: publicKey(params.buyer),
        });

        // Create web3.js transaction
        const connection = this.solanaService.getConnection();
        const { blockhash } = await connection.getLatestBlockhash();

        const transaction = new Transaction();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = new PublicKey(params.buyer);

        // Add compute budget
        transaction.add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 })
        );

        // Payment to seller
        transaction.add(
            SystemProgram.transfer({
                fromPubkey: new PublicKey(params.buyer),
                toPubkey: new PublicKey(params.seller),
                lamports: Math.floor(sellerReceives * LAMPORTS_PER_SOL),
            })
        );

        // Platform fee
        if (platformFee > 0) {
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: new PublicKey(params.buyer),
                    toPubkey: this.platformKeypair.publicKey,
                    lamports: Math.floor(platformFee * LAMPORTS_PER_SOL),
                })
            );
        }

        // Note: For P2P cNFT sales, the transfer is executed server-side after payment confirms
        // The transaction here only handles the SOL payment
        // The cNFT transfer will be done via transferCompressedNFT after payment is confirmed

        // Serialize (requires buyer to sign for payment)
        const serialized = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        });

        return {
            transaction: serialized.toString('base64'),
            sellerReceives,
            platformFee,
        };
    }

    /**
     * Verify ownership of a compressed NFT
     * 
     * @param assetId - The asset ID to verify
     * @param owner - The expected owner address
     * @returns True if the owner matches
     */
    async verifyOwnership(assetId: string, owner: string): Promise<boolean> {
        try {
            const asset = await this.getAssetFromDAS(assetId);
            return asset.ownership.owner === owner;
        } catch (error) {
            console.error('Failed to verify ownership:', error);
            return false;
        }
    }

    /**
     * Get asset details from DAS API
     */
    async getAssetFromDAS(assetId: string): Promise<DASAsset> {
        const response = await fetch(this.dasApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'etcha-get-asset',
                method: 'getAsset',
                params: { id: assetId },
            }),
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(`DAS API error: ${data.error.message}`);
        }

        return data.result;
    }

    /**
     * Get asset proof from DAS API (required for transfers)
     */
    async getAssetProofFromDAS(assetId: string): Promise<AssetProof> {
        const response = await fetch(this.dasApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'etcha-get-asset-proof',
                method: 'getAssetProof',
                params: { id: assetId },
            }),
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(`DAS API error: ${data.error.message}`);
        }

        const result: DASAssetProof = data.result;

        return {
            root: Buffer.from(result.root, 'base64'),
            proof: result.proof.map(p => Buffer.from(p, 'base64')),
            nodeIndex: result.node_index,
            leaf: Buffer.from(result.leaf, 'base64'),
            treeId: result.tree_id,
        };
    }

    /**
     * Get asset with proof in UMI format (for transfer operations)
     */
    private async getAssetWithProofFromDAS(assetId: string) {
        // Use UMI's built-in method when available, fallback to manual fetch
        try {
            return await getAssetWithProof(this.umi, publicKey(assetId));
        } catch {
            // Manual fallback using DAS API
            const [asset, proofData] = await Promise.all([
                this.getAssetFromDAS(assetId),
                this.getAssetProofFromDAS(assetId),
            ]);

            return {
                leafOwner: publicKey(asset.ownership.owner),
                leafDelegate: asset.ownership.delegate
                    ? publicKey(asset.ownership.delegate)
                    : publicKey(asset.ownership.owner),
                merkleTree: publicKey(asset.compression.tree),
                root: Array.from(proofData.root) as any,
                dataHash: Array.from(Buffer.from(asset.compression.data_hash, 'base64')) as any,
                creatorHash: Array.from(Buffer.from(asset.compression.creator_hash, 'base64')) as any,
                nonce: asset.compression.leaf_id,
                index: proofData.nodeIndex,
                proof: proofData.proof.map(p => publicKey(p.toString('base64'))),
            };
        }
    }

    /**
     * Get Merkle tree configuration
     */
    async getTreeConfig(merkleTreeAddress: string): Promise<TreeConfigData> {
        const treeConfigPda = this.findTreeConfigPda(merkleTreeAddress);
        const accountInfo = await this.connection.getAccountInfo(
            new PublicKey(treeConfigPda)
        );

        if (!accountInfo) {
            throw new Error('Tree config not found');
        }

        // Parse tree config from account data
        // TreeConfig: discriminator (8) + treeCreator (32) + treeDelegate (32) + totalMintCapacity (8) + numMinted (8) + isPublic (1) + isDecompressible (1)
        const data = accountInfo.data;

        return {
            treeCreator: new PublicKey(data.slice(8, 40)).toString(),
            treeDelegate: new PublicKey(data.slice(40, 72)).toString(),
            totalMintCapacity: data.readBigUInt64LE(72),
            numMinted: data.readBigUInt64LE(80),
            isPublic: data[88] === 1,
            isDecompressible: data[89],
        };
    }

    /**
     * Get tree statistics
     */
    async getTreeStats(merkleTreeAddress: string): Promise<{
        totalCapacity: number;
        minted: number;
        remaining: number;
        percentUsed: number;
    }> {
        const config = await this.getTreeConfig(merkleTreeAddress);
        const totalCapacity = Number(config.totalMintCapacity);
        const minted = Number(config.numMinted);
        const remaining = totalCapacity - minted;
        const percentUsed = (minted / totalCapacity) * 100;

        return {
            totalCapacity,
            minted,
            remaining,
            percentUsed,
        };
    }

    /**
     * Find tree config PDA
     */
    private findTreeConfigPda(merkleTreeAddress: string): string {
        const [pda] = PublicKey.findProgramAddressSync(
            [new PublicKey(merkleTreeAddress).toBuffer()],
            new PublicKey(MPL_BUBBLEGUM_PROGRAM_ID)
        );
        return pda.toString();
    }

    /**
     * Parse leaf data from mint transaction
     */
    private async parseLeafFromTransaction(
        merkleTree: string,
        signature: string
    ): Promise<{
        assetId: string;
        leafIndex: number;
        dataHash: string;
        creatorHash: string;
    }> {
        // Get tree config to determine leaf index
        const config = await this.getTreeConfig(merkleTree);
        const leafIndex = Number(config.numMinted) - 1;

        // Calculate asset ID from tree + leaf index
        const [assetId] = findLeafAssetIdPda(this.umi, {
            merkleTree: publicKey(merkleTree),
            leafIndex,
        });

        // For data hash and creator hash, we'd need to parse the transaction
        // or wait for DAS indexing. Using placeholders for now.
        return {
            assetId: assetId.toString(),
            leafIndex,
            dataHash: '', // Will be populated by DAS after indexing
            creatorHash: '', // Will be populated by DAS after indexing
        };
    }

    /**
     * Estimate tree creation cost based on depth
     */
    private estimateTreeCreationCost(maxDepth: number): number {
        // Approximate costs based on account size requirements
        // Account size = ~32 + 32 + 32 + 8 + 8 + 1 + (2^maxDepth * 32)
        const nodeCount = Math.pow(2, maxDepth);
        const accountSize = 100 + nodeCount * 32;
        const rentExempt = (accountSize * 6960) / LAMPORTS_PER_SOL;
        return rentExempt + 0.01; // Add buffer for transaction fees
    }

    /**
     * Create a collection NFT for cNFT collection
     * Standard NFT that serves as the collection parent for compressed NFTs
     */
    async createCollectionNFT(params: {
        name: string;
        symbol: string;
        uri: string;
        sellerFeeBasisPoints?: number;
    }): Promise<{
        collectionAddress: string;
        signature: string;
    }> {
        console.log('Creating collection NFT for cNFT collection...');

        const collectionMint = generateSigner(this.umi);

        // Use percentAmount for seller fee (250 basis points = 2.5%)
        const sellerFee = (params.sellerFeeBasisPoints ?? 250) / 100;

        const builder = createNft(this.umi, {
            mint: collectionMint,
            name: params.name,
            symbol: params.symbol,
            uri: params.uri,
            sellerFeeBasisPoints: { basisPoints: BigInt(params.sellerFeeBasisPoints ?? 250), identifier: '%', decimals: 2 } as any,
            isCollection: true,
        });

        const result = await builder.sendAndConfirm(this.umi);
        const signature = Buffer.from(result.signature).toString('base64');

        console.log('Collection NFT created!');
        console.log('Address:', collectionMint.publicKey);

        return {
            collectionAddress: collectionMint.publicKey.toString(),
            signature,
        };
    }
}
