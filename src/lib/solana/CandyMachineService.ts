import { PublicKey } from '@solana/web3.js';
import { SolanaService } from './SolanaService';
import { CollectionService } from './CollectionService';
import { SolanaCollection } from './adapters';
import { getMetadataUri, getTicketMetadataUri } from './adapters';

export type ProgressCallback = (message: string, step?: string, progress?: number) => void;

export class CandyMachineService {
    private solanaService: SolanaService;
    private collectionService: CollectionService;
    private progressCallback?: ProgressCallback;

    constructor(solanaService: SolanaService, collectionService: CollectionService, progressCallback?: ProgressCallback) {
        this.solanaService = solanaService;
        this.collectionService = collectionService;
        this.progressCallback = progressCallback;
    }

    private emitProgress(message: string, step?: string, progress?: number) {
        console.log(message);
        if (this.progressCallback) {
            this.progressCallback(message, step, progress);
        }
    }

    /**
     * Создает полную коллекцию: Collection NFT + Candy Machine + все items с guards
     * @param collection - Параметры коллекции
     * @param organizerPublicKey - Публичный ключ организатора для получения платежей
     * @returns Объект с адресами Collection NFT и Candy Machine
     */
    async createFullCollection(
        collection: SolanaCollection,
        organizerPublicKey: PublicKey
    ): Promise<{ collectionNftAddress: string; candyMachineAddress: string }> {
        try {
            this.emitProgress(`🚀 Starting full collection creation for: ${collection.name}`, 'full-collection', 0);

            // Шаг 1: Создаем Collection NFT
            this.emitProgress('📦 Step 1/2: Creating Collection NFT...', 'full-collection', 10);
            const collectionNftAddress = await this.createCollectionNFT(collection);

            // Обновляем коллекцию с адресом NFT
            collection.collectionNftAddress = collectionNftAddress;

            // Шаг 2: Создаем Candy Machine с guards и загружаем все items
            this.emitProgress('🍭 Step 2/2: Creating Candy Machine with all items...', 'full-collection', 50);
            const candyMachineAddress = await this.createCandyMachine(collection, organizerPublicKey, true);

            this.emitProgress('🎉 Full collection created successfully!', 'full-collection', 100);

            return {
                collectionNftAddress,
                candyMachineAddress,
            };
        } catch (error) {
            console.error('❌ Error creating full collection:', error);
            throw new Error(`Failed to create full collection: ${(error as Error).message}`);
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
            const candyMachine = await metaplex.candyMachines().create({
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

            this.emitProgress('✅ Candy Machine created!', 'candy-machine', 25);

            // ✅ Правильное извлечение адреса
            const candyMachineAddress = this.asBase58Address(candyMachine.candyMachine);

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

    async prepareMintTransaction(
        collectionId: string,
        userWallet: string,
        quantity: number = 1
    ): Promise<{ transaction: string; candyMachineAddress: string; nftMintAddress: string }> {
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
            const organizerPublicKey = new PublicKey(collection.eventCreatorWallet);

            if (!collection.collectionNftAddress) {
                console.log('🎨 Collection NFT not found, creating...');
                const collectionNftAddress = await this.createCollectionNFT(collection);
                await this.collectionService.updateCollection(collectionId, {
                    collectionNftAddress,
                });
                collection.collectionNftAddress = collectionNftAddress;
            }

            if (!collection.candyMachineAddress) {
                console.log('🍭 Candy Machine not found, creating with organizer as payment destination...');
                const candyMachineAddress = await this.createCandyMachine(collection, organizerPublicKey);
                await this.collectionService.updateCollection(collectionId, {
                    candyMachineAddress,
                });
                collection.candyMachineAddress = candyMachineAddress;
                console.log('✅ Candy Machine created! Payment goes to organizer.');
            }

            // TODO: Implement mint transaction preparation using old Metaplex SDK
            throw new Error('Mint transaction preparation not yet implemented with old Metaplex SDK');
        } catch (error) {
            console.error('❌ Error preparing mint transaction:', error);
            throw new Error(`Failed to prepare mint transaction: ${(error as Error).message}`);
        }
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
