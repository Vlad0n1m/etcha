import { PublicKey } from '@solana/web3.js';
import { SolanaService } from './SolanaService';
import { CollectionService } from './CollectionService';
import { SolanaCollection } from './adapters';
import { getMetadataUri, getTicketMetadataUri } from './adapters';
import { BubblegumService, MerkleTreeSize, MERKLE_TREE_CONFIGS, CNFTMetadata } from './BubblegumService';
import { NFTType } from './types';

export type ProgressCallback = (message: string, step?: string, progress?: number) => void;

/**
 * Result of creating a full collection (supports both legacy and cNFT)
 */
export interface CreateCollectionResult {
    collectionNftAddress: string;
    candyMachineAddress?: string;  // Only for legacy
    merkleTreeAddress?: string;     // Only for cNFT
    merkleTreeDepth?: number;       // Only for cNFT
    nftType: NFTType;
}

/**
 * Parameters for creating a collection
 */
export interface CreateCollectionParams {
    collection: SolanaCollection;
    organizerPublicKey: PublicKey;
    nftType?: NFTType;
    merkleTreeSize?: MerkleTreeSize;
}

/**
 * Result of minting tickets
 */
export interface MintResult {
    success: boolean;
    nftType: NFTType;
    // Legacy NFT fields
    nftMintAddresses?: string[];
    // cNFT fields
    assetIds?: string[];
    leafIndices?: number[];
    dataHashes?: string[];
    creatorHashes?: string[];
    // Common
    transactionSignature: string;
}

export class CandyMachineService {
    private solanaService: SolanaService;
    private collectionService: CollectionService;
    private bubblegumService: BubblegumService;
    private progressCallback?: ProgressCallback;

    constructor(solanaService: SolanaService, collectionService: CollectionService, progressCallback?: ProgressCallback) {
        this.solanaService = solanaService;
        this.collectionService = collectionService;
        this.bubblegumService = new BubblegumService(solanaService);
        this.progressCallback = progressCallback;
    }

    /**
     * Get the BubblegumService instance for direct cNFT operations
     */
    getBubblegumService(): BubblegumService {
        return this.bubblegumService;
    }

    private emitProgress(message: string, step?: string, progress?: number) {
        console.log(message);
        if (this.progressCallback) {
            this.progressCallback(message, step, progress);
        }
    }

    /**
     * Determine the recommended tree size based on ticket count
     */
    private getRecommendedTreeSize(maxTickets: number): MerkleTreeSize {
        if (maxTickets <= MERKLE_TREE_CONFIGS.SMALL.capacity) {
            return 'SMALL';
        } else if (maxTickets <= MERKLE_TREE_CONFIGS.MEDIUM.capacity) {
            return 'MEDIUM';
        }
        return 'LARGE';
    }

    /**
     * Creates a full collection with support for both legacy NFTs and cNFTs
     * 
     * For legacy: Collection NFT + Candy Machine + all items
     * For cNFT: Collection NFT + Merkle Tree (no items needed upfront)
     * 
     * @param params - Collection creation parameters
     * @returns Object with collection addresses based on NFT type
     */
    async createFullCollection(params: CreateCollectionParams): Promise<CreateCollectionResult>;
    /**
     * @deprecated Use params object instead. Legacy signature for backward compatibility.
     */
    async createFullCollection(
        collection: SolanaCollection,
        organizerPublicKey: PublicKey
    ): Promise<CreateCollectionResult>;
    async createFullCollection(
        paramsOrCollection: CreateCollectionParams | SolanaCollection,
        organizerPublicKey?: PublicKey
    ): Promise<CreateCollectionResult> {
        // Handle both old and new signatures
        let params: CreateCollectionParams;
        if ('collection' in paramsOrCollection) {
            params = paramsOrCollection;
        } else {
            // Legacy call signature
            params = {
                collection: paramsOrCollection,
                organizerPublicKey: organizerPublicKey!,
                nftType: paramsOrCollection.nftType || 'legacy',
            };
        }

        const { collection, nftType = 'legacy' } = params;

        // Route to appropriate creation method based on NFT type
        if (nftType === 'cnft') {
            return this.createCNFTCollection(params);
        }

        // Legacy flow (default)
        return this.createLegacyCollection(params);
    }

    /**
     * Create a cNFT collection with Merkle tree
     * Much cheaper than legacy: ~0.1 SOL for tree creation vs ~1.5 SOL for 100-item Candy Machine
     */
    private async createCNFTCollection(params: CreateCollectionParams): Promise<CreateCollectionResult> {
        const { collection, merkleTreeSize } = params;

        try {
            this.emitProgress(`🚀 Starting cNFT collection creation for: ${collection.name}`, 'cnft-collection', 0);

            // Step 1: Create Collection NFT (same as legacy, needed for collection grouping)
            this.emitProgress('📦 Step 1/2: Creating Collection NFT...', 'cnft-collection', 10);
            const collectionResult = await this.bubblegumService.createCollectionNFT({
                name: collection.name,
                symbol: collection.name.substring(0, 4).toUpperCase(),
                uri: getMetadataUri(collection.id),
                sellerFeeBasisPoints: 250,
            });

            // Step 2: Create Merkle Tree
            this.emitProgress('🌳 Step 2/2: Creating Merkle Tree...', 'cnft-collection', 50);
            const treeSize = merkleTreeSize || this.getRecommendedTreeSize(collection.maxTickets);
            const treeResult = await this.bubblegumService.createMerkleTree(treeSize);

            this.emitProgress(`🎉 cNFT collection created successfully!`, 'cnft-collection', 100);
            this.emitProgress(`  Collection NFT: ${collectionResult.collectionAddress}`, 'cnft-collection', 100);
            this.emitProgress(`  Merkle Tree: ${treeResult.merkleTreeAddress}`, 'cnft-collection', 100);
            this.emitProgress(`  Capacity: ${treeResult.capacity} tickets`, 'cnft-collection', 100);

            return {
                collectionNftAddress: collectionResult.collectionAddress,
                merkleTreeAddress: treeResult.merkleTreeAddress,
                merkleTreeDepth: treeResult.maxDepth,
                nftType: 'cnft',
            };
        } catch (error) {
            console.error('❌ Error creating cNFT collection:', error);
            throw new Error(`Failed to create cNFT collection: ${(error as Error).message}`);
        }
    }

    /**
     * Create a legacy collection with Candy Machine
     * Original implementation preserved for backward compatibility
     */
    private async createLegacyCollection(params: CreateCollectionParams): Promise<CreateCollectionResult> {
        const { collection, organizerPublicKey } = params;

        try {
            this.emitProgress(`🚀 Starting legacy collection creation for: ${collection.name}`, 'full-collection', 0);

            // Step 1: Create Collection NFT
            this.emitProgress('📦 Step 1/2: Creating Collection NFT...', 'full-collection', 10);
            const collectionNftAddress = await this.createCollectionNFT(collection);

            // Update collection with NFT address
            collection.collectionNftAddress = collectionNftAddress;

            // Step 2: Create Candy Machine with guards and load all items
            this.emitProgress('🍭 Step 2/2: Creating Candy Machine with all items...', 'full-collection', 50);
            const candyMachineAddress = await this.createCandyMachine(collection, organizerPublicKey, true);

            this.emitProgress('🎉 Legacy collection created successfully!', 'full-collection', 100);

            return {
                collectionNftAddress,
                candyMachineAddress,
                nftType: 'legacy',
            };
        } catch (error) {
            console.error('❌ Error creating legacy collection:', error);
            throw new Error(`Failed to create legacy collection: ${(error as Error).message}`);
        }
    }

    /**
     * ТОЧНО КАК В РАБОЧЕМ КОДЕ: Создание Collection NFT с использованием старой библиотеки @metaplex-foundation/js
     */
    async createCollectionNFT(collection: SolanaCollection): Promise<string> {
        try {
            this.emitProgress('🎨 Starting Collection NFT creation...', 'collection-nft', 0);

            const metaplex = this.solanaService.getMetaplex();

            const balance = await this.solanaService.getBalance();
            this.emitProgress(`💰 Wallet balance: ${balance} SOL`, 'collection-nft', 10);

            if (balance < 0.01) {
                throw new Error('Insufficient SOL balance for transaction');
            }

            const metadataUri = getMetadataUri(collection.id);
            this.emitProgress('📝 Creating metadata URI...', 'collection-nft', 30);

            this.emitProgress('⚡ Creating Collection NFT on-chain...', 'collection-nft', 50);

            // ✅ ТОЧНО КАК В РАБОЧЕМ КОДЕ из etcha-candy
            const collectionNft = await metaplex.nfts().create({
                name: collection.name,
                symbol: collection.name.substring(0, 4).toUpperCase(),
                uri: metadataUri,
                sellerFeeBasisPoints: 250, // 2.5% royalty
                creators: [
                    {
                        address: this.solanaService.getKeypair().publicKey,
                        share: 100, // 100% to platform
                    }
                ],
                isCollection: true, // ✅ Это работает с @metaplex-foundation/js
            });

            const addressString = collectionNft.nft.address.toString();

            this.emitProgress(`🎉 Collection NFT created successfully! Address: ${addressString}`, 'collection-nft', 100);
            console.log('NFT Address:', addressString);
            console.log('NFT Symbol:', collectionNft.nft.symbol);
            console.log('Metadata URI:', metadataUri);

            return addressString;
        } catch (error) {
            console.error('❌ Error creating Collection NFT:', error);
            throw new Error(`Failed to create Collection NFT: ${(error as Error).message}`);
        }
    }

    /**
     * ТОЧНО КАК В РАБОЧЕМ КОДЕ: Создает Candy Machine с guards на оплату
     * @param collection - Коллекция с параметрами
     * @param organizerPublicKey - Публичный ключ организатора для получения платежей
     * @param loadAllItems - Загрузить все items сразу (по умолчанию true)
     * @returns Адрес созданной Candy Machine
     */
    async createCandyMachine(
        collection: SolanaCollection,
        organizerPublicKey: PublicKey,
        loadAllItems: boolean = true
    ): Promise<string> {
        try {
            this.emitProgress(`🍭 Creating Candy Machine for collection: ${collection.name}`, 'candy-machine', 0);

            if (!collection.collectionNftAddress) {
                throw new Error('Collection NFT must be created before Candy Machine');
            }

            const metaplex = this.solanaService.getMetaplex();

            const balance = await this.solanaService.getBalance();
            this.emitProgress(`💰 Platform wallet balance: ${balance} SOL`, 'candy-machine', 10);

            if (balance < 0.1) {
                throw new Error('Insufficient SOL balance for Candy Machine creation');
            }

            this.emitProgress('⚙️ Configuring Candy Machine settings...', 'candy-machine', 15);

            // ✅ ТОЧНО КАК В РАБОЧЕМ КОДЕ из etcha-candy
            const createResult = await metaplex.candyMachines().create({
                itemsAvailable: collection.maxTickets,
                sellerFeeBasisPoints: 250, // 2.5% royalty
                symbol: collection.name.substring(0, 4).toUpperCase(),
                creators: [
                    {
                        address: this.solanaService.getKeypair().publicKey,
                        share: 100,
                    }
                ],
                collection: {
                    address: new PublicKey(collection.collectionNftAddress),
                    updateAuthority: this.solanaService.getKeypair(),
                },
                // ✅ Правильное использование guards для цены
                guards: {
                    solPayment: {
                        amount: {
                            basisPoints: BigInt(Math.floor(collection.ticketPrice * 1e9)), // Convert SOL to lamports
                            currency: {
                                symbol: 'SOL',
                                decimals: 9,
                            },
                        },
                        destination: organizerPublicKey, // ✅ Платежи идут организатору
                    },
                },
            });

            console.log('🔍 Debug: createResult structure:', JSON.stringify(createResult, null, 2));
            console.log('🔍 Debug: createResult keys:', Object.keys(createResult));
            console.log('🔍 Debug: createResult.candyMachine:', createResult.candyMachine);

            this.emitProgress('✅ Candy Machine created!', 'candy-machine', 25);

            // ✅ Правильное извлечение адреса - используем createResult вместо candyMachine
            const candyMachineAddress = this.asBase58Address(createResult.candyMachine);

            // Runtime проверка что адрес валидный base58
            if (!(typeof candyMachineAddress === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(candyMachineAddress))) {
                throw new Error('CandyMachine address must be a base58 string');
            }

            this.emitProgress(`✅ Candy Machine Address: ${candyMachineAddress}`, 'candy-machine', 30);
            this.emitProgress(`💰 Payment guard configured: ${collection.ticketPrice} SOL -> ${organizerPublicKey.toBase58()}`, 'candy-machine', 35);
            console.log('Candy Machine Address:', candyMachineAddress);

            // Загружаем все NFT items
            if (loadAllItems) {
                this.emitProgress(`🎫 Loading ALL ${collection.maxTickets} items into Candy Machine...`, 'candy-machine', 40);
                await this.addItemsToCandyMachine(candyMachineAddress, collection);
                this.emitProgress(`✅ All ${collection.maxTickets} items loaded successfully!`, 'candy-machine', 100);
            } else {
                this.emitProgress('✅ Candy Machine created! Items can be loaded later.', 'candy-machine', 100);
            }

            console.log('🎉 Candy Machine creation completed. Returning address:', candyMachineAddress);

            return candyMachineAddress;
        } catch (error) {
            console.error('❌ Error creating Candy Machine:', error);
            throw new Error(`Failed to create Candy Machine: ${(error as Error).message}`);
        }
    }

    /**
     * ТОЧНО КАК В РАБОЧЕМ КОДЕ: Добавляет NFT items в Candy Machine
     */
    async addItemsToCandyMachine(candyMachineAddress: string, collection: SolanaCollection, minRequired?: number): Promise<void> {
        try {
            const metaplex = this.solanaService.getMetaplex();

            // Получаем Candy Machine
            const candyMachine = await metaplex.candyMachines().findByAddress({
                address: new PublicKey(candyMachineAddress),
            });

            console.log('🎫 Adding items to Candy Machine...');

            // Определяем сколько items нужно добавить
            const totalItems = minRequired !== undefined ? minRequired : collection.maxTickets;

            // Создаем элементы для каждого билета
            const items = Array.from({ length: totalItems }, (_, i) => ({
                name: `Ticket #${String(i + 1).padStart(3, '0')}`,
                uri: getTicketMetadataUri(collection.id, String(i + 1)),
            }));

            console.log(`🎫 Adding ${items.length} items to Candy Machine...`);
            this.emitProgress(`🎫 Preparing ${items.length} ticket items...`, 'items', 0);

            // ✅ ТОЧНО КАК В РАБОЧЕМ КОДЕ: Добавляем элементы пакетами по 5 штук
            const batchSize = 5;
            const totalBatches = Math.ceil(items.length / batchSize);

            for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize);
                const batchNum = Math.floor(i / batchSize) + 1;
                const progress = Math.floor((batchNum / totalBatches) * 100);

                console.log(`🎫 Adding batch ${batchNum}/${totalBatches} (${batch.length} items)...`);
                this.emitProgress(`🎫 Adding batch ${batchNum}/${totalBatches} (${batch.length} items)...`, 'items', progress);

                await metaplex.candyMachines().insertItems({
                    candyMachine,
                    items: batch,
                });

                console.log(`✅ Batch ${batchNum} added successfully!`);
            }

            console.log('✅ All items added to Candy Machine successfully!');
            this.emitProgress('✅ All items added successfully!', 'items', 100);
        } catch (error) {
            console.error('❌ Error adding items to Candy Machine:', error);
            throw new Error(`Failed to add items to Candy Machine: ${(error as Error).message}`);
        }
    }

    /**
     * Prepare a mint transaction for the given collection
     * Automatically detects NFT type and routes to appropriate method
     */
    async prepareMintTransaction(
        collectionId: string,
        userWallet: string,
        quantity: number = 1
    ): Promise<{
        transaction: string;
        nftType: NFTType;
        // Legacy fields
        candyMachineAddress?: string;
        nftMintAddress?: string;
        // cNFT fields
        merkleTreeAddress?: string;
        expectedAssetIds?: string[];
    }> {
        try {
            console.log('🎫 Preparing mint transaction...');
            console.log('Collection ID:', collectionId);
            console.log('User Wallet:', userWallet);
            console.log('Quantity:', quantity);

            const collection = await this.collectionService.getCollectionById(collectionId);
            if (!collection) {
                throw new Error('Collection not found');
            }

            if (!collection.eventCreatorWallet) {
                throw new Error('Event creator wallet not found in collection');
            }

            // Route based on NFT type
            if (collection.nftType === 'cnft') {
                return this.prepareCNFTMintTransaction(collection, userWallet, quantity);
            }

            // Legacy flow
            return this.prepareLegacyMintTransaction(collection, userWallet, quantity);
        } catch (error) {
            console.error('❌ Error preparing mint transaction:', error);
            throw new Error(`Failed to prepare mint transaction: ${(error as Error).message}`);
        }
    }

    /**
     * Prepare a cNFT mint transaction
     */
    private async prepareCNFTMintTransaction(
        collection: SolanaCollection,
        userWallet: string,
        quantity: number
    ): Promise<{
        transaction: string;
        nftType: NFTType;
        merkleTreeAddress: string;
        expectedAssetIds: string[];
    }> {
        console.log('🌳 Preparing cNFT mint transaction...');

        if (!collection.merkleTreeAddress) {
            throw new Error('Merkle tree not found for cNFT collection');
        }

        if (!collection.collectionNftAddress) {
            throw new Error('Collection NFT not found');
        }

        // Get next ticket number
        const nextTicketNumber = collection.ticketsSold + 1;
        const expectedAssetIds: string[] = [];

        // For now, mint one at a time (can be batched in future)
        // Build transaction for each ticket
        for (let i = 0; i < quantity; i++) {
            const ticketNumber = nextTicketNumber + i;
            const metadata: CNFTMetadata = {
                name: `Ticket #${String(ticketNumber).padStart(3, '0')}`,
                symbol: collection.name.substring(0, 4).toUpperCase(),
                uri: getTicketMetadataUri(collection.id, String(ticketNumber)),
                sellerFeeBasisPoints: 250,
                creators: [{
                    address: this.solanaService.getKeypair().publicKey.toString(),
                    share: 100,
                    verified: true,
                }],
            };

            const result = await this.bubblegumService.buildMintTransaction({
                merkleTree: collection.merkleTreeAddress,
                collectionMint: collection.collectionNftAddress,
                metadata,
                recipient: userWallet,
                priceInSol: collection.ticketPrice,
                paymentDestination: collection.eventCreatorWallet,
            });

            expectedAssetIds.push(result.expectedAssetId);

            // For single quantity, return immediately
            if (quantity === 1) {
                return {
                    transaction: result.transaction,
                    nftType: 'cnft',
                    merkleTreeAddress: collection.merkleTreeAddress,
                    expectedAssetIds,
                };
            }
        }

        // TODO: For multiple tickets, need to combine transactions
        throw new Error('Multiple cNFT minting in single transaction not yet implemented');
    }

    /**
     * Prepare a legacy mint transaction using Candy Machine
     */
    private async prepareLegacyMintTransaction(
        collection: SolanaCollection,
        userWallet: string,
        quantity: number
    ): Promise<{
        transaction: string;
        nftType: NFTType;
        candyMachineAddress: string;
        nftMintAddress: string;
    }> {
        console.log('🍭 Preparing legacy Candy Machine mint transaction...');

        const organizerPublicKey = new PublicKey(collection.eventCreatorWallet);

        // Ensure Collection NFT exists
        if (!collection.collectionNftAddress) {
            console.log('🎨 Collection NFT not found, creating...');
            const collectionNftAddress = await this.createCollectionNFT(collection);
            await this.collectionService.updateCollection(collection.id, {
                collectionNftAddress,
            });
            collection.collectionNftAddress = collectionNftAddress;
        }

        // Ensure Candy Machine exists
        if (!collection.candyMachineAddress) {
            console.log('🍭 Candy Machine not found, creating...');
            const candyMachineAddress = await this.createCandyMachine(collection, organizerPublicKey);
            await this.collectionService.updateCollection(collection.id, {
                candyMachineAddress,
            });
            collection.candyMachineAddress = candyMachineAddress;
        }

        // TODO: Implement mint transaction preparation using old Metaplex SDK
        // This requires building the transaction client-side with the Candy Machine
        throw new Error('Legacy mint transaction preparation not yet fully implemented');
    }

    /**
     * Mint cNFT tickets directly (server-side, for admin operations)
     */
    async mintCNFTTickets(
        collectionId: string,
        recipientWallet: string,
        quantity: number = 1
    ): Promise<MintResult> {
        console.log('🎫 Minting cNFT tickets directly...');

        const collection = await this.collectionService.getCollectionById(collectionId);
        if (!collection) {
            throw new Error('Collection not found');
        }

        if (collection.nftType !== 'cnft') {
            throw new Error('Collection is not configured for cNFT');
        }

        if (!collection.merkleTreeAddress || !collection.collectionNftAddress) {
            throw new Error('cNFT collection not properly initialized');
        }

        const assetIds: string[] = [];
        const leafIndices: number[] = [];
        const dataHashes: string[] = [];
        const creatorHashes: string[] = [];
        let lastSignature = '';

        for (let i = 0; i < quantity; i++) {
            const ticketNumber = collection.ticketsSold + i + 1;
            const metadata: CNFTMetadata = {
                name: `Ticket #${String(ticketNumber).padStart(3, '0')}`,
                symbol: collection.name.substring(0, 4).toUpperCase(),
                uri: getTicketMetadataUri(collection.id, String(ticketNumber)),
                sellerFeeBasisPoints: 250,
                creators: [{
                    address: this.solanaService.getKeypair().publicKey.toString(),
                    share: 100,
                    verified: true,
                }],
            };

            const result = await this.bubblegumService.mintCompressedNFT({
                merkleTree: collection.merkleTreeAddress,
                collectionMint: collection.collectionNftAddress,
                metadata,
                recipient: recipientWallet,
            });

            assetIds.push(result.assetId);
            leafIndices.push(result.leafIndex);
            dataHashes.push(result.dataHash);
            creatorHashes.push(result.creatorHash);
            lastSignature = result.signature;
        }

        return {
            success: true,
            nftType: 'cnft',
            assetIds,
            leafIndices,
            dataHashes,
            creatorHashes,
            transactionSignature: lastSignature,
        };
    }

    /**
     * Get collection statistics including Merkle tree info for cNFT
     */
    async getCollectionStats(collectionId: string): Promise<{
        nftType: NFTType;
        ticketsSold: number;
        ticketsAvailable: number;
        // Legacy specific
        candyMachineInfo?: {
            address: string;
            itemsMinted: string;
            itemsAvailable: string;
            isFullyLoaded: boolean;
        };
        // cNFT specific
        merkleTreeInfo?: {
            address: string;
            totalCapacity: number;
            minted: number;
            remaining: number;
            percentUsed: number;
        };
    }> {
        const collection = await this.collectionService.getCollectionById(collectionId);
        if (!collection) {
            throw new Error('Collection not found');
        }

        const baseStats = {
            nftType: collection.nftType,
            ticketsSold: collection.ticketsSold,
            ticketsAvailable: collection.maxTickets - collection.ticketsSold,
        };

        if (collection.nftType === 'cnft' && collection.merkleTreeAddress) {
            const treeStats = await this.bubblegumService.getTreeStats(collection.merkleTreeAddress);
            return {
                ...baseStats,
                merkleTreeInfo: {
                    address: collection.merkleTreeAddress,
                    ...treeStats,
                },
            };
        }

        if (collection.candyMachineAddress) {
            const cmInfo = await this.getCandyMachineInfo(collection.candyMachineAddress);
            return {
                ...baseStats,
                candyMachineInfo: {
                    address: collection.candyMachineAddress,
                    itemsMinted: cmInfo.itemsMinted,
                    itemsAvailable: cmInfo.itemsAvailable,
                    isFullyLoaded: cmInfo.isFullyLoaded,
                },
            };
        }

        return baseStats;
    }

    async getCandyMachineInfo(candyMachineAddress: string) {
        try {
            const metaplex = this.solanaService.getMetaplex();

            const candyMachine = await metaplex.candyMachines().findByAddress({
                address: new PublicKey(candyMachineAddress),
            });

            return {
                address: candyMachineAddress,
                itemsMinted: candyMachine.itemsMinted.toString(),
                itemsAvailable: candyMachine.itemsAvailable.toString(),
                itemsLoaded: candyMachine.itemsLoaded.toString(),
                isFullyLoaded: candyMachine.isFullyLoaded,
                symbol: candyMachine.symbol,
                sellerFeeBasisPoints: candyMachine.sellerFeeBasisPoints,
            };
        } catch (error) {
            console.error('Error getting Candy Machine info:', error);
            throw new Error(`Failed to get Candy Machine info: ${(error as Error).message}`);
        }
    }

    async getUserTickets(_userWallet: string, _collectionId?: string): Promise<unknown[]> {
        throw new Error('getUserTickets not yet implemented with old Metaplex SDK');
    }

    async validateTicket(_nftAddress: string, _collectionId: string): Promise<boolean> {
        throw new Error('validateTicket not yet implemented with old Metaplex SDK');
    }

    /**
     * ✅ ТОЧНО КАК В РАБОЧЕМ КОДЕ: Функция для безопасного извлечения base58 адреса
     */
    private asBase58Address(x: unknown): string {
        console.log('asBase58Address input:', x, typeof x);

        // если уже строка — валидируем и возвращаем
        if (typeof x === 'string') {
            try {
                return new PublicKey(x).toBase58();
            } catch {
                throw new Error(`Invalid base58 string: ${x}`);
            }
        }

        // если это PublicKey из web3.js
        if (x && typeof x === 'object' && 'toBase58' in x && typeof (x as Record<string, unknown>).toBase58 === 'function') {
            return (x as { toBase58: () => string }).toBase58();
        }

        // если это объект с публичным ключом
        if (x && typeof x === 'object') {
            const obj = x as Record<string, unknown>;
            if (obj.publicKey && typeof obj.publicKey === 'object' && obj.publicKey !== null && 'toBase58' in obj.publicKey && typeof (obj.publicKey as Record<string, unknown>).toBase58 === 'function') {
                return (obj.publicKey as { toBase58: () => string }).toBase58();
            }
            if (obj.address && typeof obj.address === 'object' && obj.address !== null && 'toBase58' in obj.address && typeof (obj.address as Record<string, unknown>).toBase58 === 'function') {
                return (obj.address as { toBase58: () => string }).toBase58();
            }
            if (obj.pubkey && typeof obj.pubkey === 'object' && obj.pubkey !== null && 'toBase58' in obj.pubkey && typeof (obj.pubkey as Record<string, unknown>).toBase58 === 'function') {
                return (obj.pubkey as { toBase58: () => string }).toBase58();
            }
            if (obj.pubkey && typeof obj.pubkey === 'string') {
                return obj.pubkey;
            }
            if (obj.pubkey && typeof obj.pubkey === 'object' && obj.pubkey !== null) {
                const pubkey = obj.pubkey as Record<string, unknown>;
                if (pubkey.publicKey && typeof pubkey.publicKey === 'object' && pubkey.publicKey !== null && 'toBase58' in pubkey.publicKey && typeof (pubkey.publicKey as Record<string, unknown>).toBase58 === 'function') {
                    return (pubkey.publicKey as { toBase58: () => string }).toBase58();
                }
                if (pubkey.address && typeof pubkey.address === 'object' && pubkey.address !== null && 'toBase58' in pubkey.address && typeof (pubkey.address as Record<string, unknown>).toBase58 === 'function') {
                    return (pubkey.address as { toBase58: () => string }).toBase58();
                }
            }
        }

        // крайний случай — попробовать toString(), иначе бросить явную ошибку
        const s = String(x);
        if (s === '[object Object]') {
            throw new Error(`Cannot extract address from object: ${JSON.stringify(x)}`);
        }

        try {
            return new PublicKey(s).toBase58();
        } catch {
            throw new Error(`Invalid public key-like value: ${s}`);
        }
    }
}
