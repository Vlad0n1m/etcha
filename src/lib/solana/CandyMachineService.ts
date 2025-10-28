import { PublicKey } from '@solana/web3.js';
import { SolanaService } from './SolanaService';
import { CollectionService } from './CollectionService';
import { SolanaCollection } from './adapters';
import { getMetadataUri, getTicketMetadataUri } from './adapters';
import {
    create,
    fetchCandyMachine,
    mintV2,
    addConfigLines,
    ConfigLine,
} from '@metaplex-foundation/mpl-candy-machine';
import {
    createNft,
    TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata';
import {
    generateSigner,
    transactionBuilder,
    publicKey as toUmiPublicKey,
    some,
    lamports,
    percentAmount,
} from '@metaplex-foundation/umi';
import { setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox';

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

    async createCollectionNFT(collection: SolanaCollection): Promise<string> {
        try {
            this.emitProgress('🎨 Starting Collection NFT creation...', 'collection-nft', 0);

            const umi = this.solanaService.getUmi();

            const balance = await this.solanaService.getBalance();
            this.emitProgress(`💰 Wallet balance: ${balance} SOL`, 'collection-nft', 10);

            if (balance < 0.01) {
                throw new Error('Insufficient SOL balance for transaction');
            }

            const metadataUri = getMetadataUri(collection.id);
            this.emitProgress('📝 Creating metadata URI...', 'collection-nft', 30);

            const collectionMint = generateSigner(umi);

            this.emitProgress('⚡ Creating Collection NFT on-chain...', 'collection-nft', 50);

            await createNft(umi, {
                mint: collectionMint,
                name: collection.name,
                symbol: collection.name.substring(0, 4).toUpperCase(),
                uri: metadataUri,
                sellerFeeBasisPoints: percentAmount(2.5),
                isCollection: true,
                updateAuthority: umi.identity, // Explicitly set update authority to backend wallet
            }).sendAndConfirm(umi);

            const addressString = collectionMint.publicKey as string;

            // ✅ DIAGNOSTIC: Verify metadata account owner
            try {
                const collectionMintPublicKey = new PublicKey(addressString);
                const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
                
                // Derive metadata PDA
                const [metadataPda] = await PublicKey.findProgramAddress(
                    [
                        Buffer.from('metadata'),
                        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                        collectionMintPublicKey.toBuffer(),
                    ],
                    TOKEN_METADATA_PROGRAM_ID
                );

                // Derive master edition PDA
                const [masterEditionPda] = await PublicKey.findProgramAddress(
                    [
                        Buffer.from('metadata'),
                        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                        collectionMintPublicKey.toBuffer(),
                        Buffer.from('edition'),
                    ],
                    TOKEN_METADATA_PROGRAM_ID
                );

                const connection = this.solanaService.getConnection();
                const metadataAccountInfo = await connection.getAccountInfo(metadataPda);
                const masterEditionAccountInfo = await connection.getAccountInfo(masterEditionPda);

                const expectedOwner = TOKEN_METADATA_PROGRAM_ID.toBase58();
                
                // Check metadata
                if (metadataAccountInfo) {
                    const actualOwner = metadataAccountInfo.owner.toBase58();
                    if (actualOwner === expectedOwner) {
                        console.log('✅ Metadata owner is correct: metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
                    } else {
                        console.warn(`⚠️ Metadata owner mismatch! Expected: ${expectedOwner}, Got: ${actualOwner}`);
                    }
                } else {
                    console.log('⚠️ Metadata account not found (might be too early to query)');
                }

                // Check master edition
                if (masterEditionAccountInfo) {
                    const actualOwner = masterEditionAccountInfo.owner.toBase58();
                    if (actualOwner === expectedOwner) {
                        console.log('✅ Master Edition owner is correct: metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
                    } else {
                        console.warn(`⚠️ Master Edition owner mismatch! Expected: ${expectedOwner}, Got: ${actualOwner}`);
                    }
                } else {
                    console.log('⚠️ Master Edition account not found - this might be the issue!');
                }
            } catch (diagnosticError) {
                console.warn('ℹ️ Could not verify metadata/master edition owner:', (diagnosticError as Error).message);
            }

            this.emitProgress(`🎉 Collection NFT created successfully! Address: ${addressString}`, 'collection-nft', 100);

            return addressString;
        } catch (error) {
            console.error('❌ Error creating Collection NFT:', error);
            throw new Error(`Failed to create Collection NFT: ${(error as Error).message}`);
        }
    }

    /**
     * Создает полностью настроенную Candy Machine с guards и всеми NFT items
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

            const umi = this.solanaService.getUmi();

            const balance = await this.solanaService.getBalance();
            this.emitProgress(`💰 Platform wallet balance: ${balance} SOL`, 'candy-machine', 10);

            if (balance < 0.01) {
                throw new Error('Insufficient SOL balance for Candy Machine creation');
            }

            const candyMachineSigner = generateSigner(umi);

            this.emitProgress('⚙️ Configuring Candy Machine settings...', 'candy-machine', 15);

            const priceInLamports = BigInt(Math.floor(collection.ticketPrice * 1e9));

            // ✅ EXTENDED DIAGNOSTIC: Verify all accounts before Candy Machine creation
            try {
                this.emitProgress('🔍 Verifying Collection NFT state before Candy Machine creation...', 'candy-machine', 16);
                
                const collectionMintPublicKey = new PublicKey(collection.collectionNftAddress);
                const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
                const connection = this.solanaService.getConnection();

                // Check mint account
                const mintInfo = await connection.getAccountInfo(collectionMintPublicKey);
                if (mintInfo) {
                    console.log('✅ Mint account exists and is owned by:', mintInfo.owner.toBase58());
                } else {
                    console.warn('⚠️ Mint account not found');
                }

                // Check metadata PDA
                const [metadataPda] = await PublicKey.findProgramAddress(
                    [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), collectionMintPublicKey.toBuffer()],
                    TOKEN_METADATA_PROGRAM_ID
                );
                const metadataInfo = await connection.getAccountInfo(metadataPda);
                if (metadataInfo) {
                    console.log('✅ Metadata account exists and is owned by:', metadataInfo.owner.toBase58());
                } else {
                    console.warn('⚠️ Metadata account not found');
                }

                // Check master edition PDA
                const [masterEditionPda] = await PublicKey.findProgramAddress(
                    [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), collectionMintPublicKey.toBuffer(), Buffer.from('edition')],
                    TOKEN_METADATA_PROGRAM_ID
                );
                const masterEditionInfo = await connection.getAccountInfo(masterEditionPda);
                if (masterEditionInfo) {
                    console.log('✅ Master Edition account exists and is owned by:', masterEditionInfo.owner.toBase58());
                } else {
                    console.warn('❌ Master Edition account NOT FOUND - this is the issue!');
                    console.warn('Collection NFT may not have been created as a proper collection NFT.');
                }
            } catch (diagError) {
                console.warn('⚠️ Diagnostic error:', (diagError as Error).message);
            }

            // Создаем Candy Machine с guards на оплату
            // ВАЖНО: collectionUpdateAuthority должна быть umi.identity так как именно она создала Collection NFT
            const candyMachineBuilder = await create(umi, {
                candyMachine: candyMachineSigner,
                collectionMint: toUmiPublicKey(collection.collectionNftAddress),
                collectionUpdateAuthority: umi.identity, // Backend wallet который создал Collection NFT
                sellerFeeBasisPoints: percentAmount(2.5),
                itemsAvailable: BigInt(collection.maxTickets),
                tokenStandard: TokenStandard.NonFungible,
                creators: [],
                configLineSettings: some({
                    prefixName: 'Ticket #',
                    nameLength: 10,
                    prefixUri: '',
                    uriLength: 200,
                    isSequential: true,
                }),
                guards: {
                    solPayment: some({
                        lamports: lamports(priceInLamports),
                        destination: toUmiPublicKey(organizerPublicKey.toBase58()),
                    }),
                },
            });

            this.emitProgress('🔏 Signing and sending Candy Machine transaction...', 'candy-machine', 20);

            // Отправляем транзакцию с нужной сигнатурой
            const sig = await candyMachineBuilder.sendAndConfirm(umi);
            console.log(`✅ Candy Machine transaction confirmed: ${sig}`);
            this.emitProgress('✅ Transaction confirmed!', 'candy-machine', 25);

            const candyMachineAddress = candyMachineSigner.publicKey;
            this.emitProgress(`✅ Candy Machine created! Address: ${candyMachineAddress}`, 'candy-machine', 30);
            this.emitProgress(`💰 Payment guard configured: ${collection.ticketPrice} SOL -> ${organizerPublicKey.toBase58()}`, 'candy-machine', 35);

            // Загружаем все NFT items
            if (loadAllItems) {
                this.emitProgress(`🎫 Loading ALL ${collection.maxTickets} items into Candy Machine...`, 'candy-machine', 40);
                await this.addItemsToCandyMachine(candyMachineAddress, collection);
                this.emitProgress(`✅ All ${collection.maxTickets} items loaded successfully!`, 'candy-machine', 100);
            } else {
                // Загружаем только начальные items (для тестирования или постепенной загрузки)
                this.emitProgress('🎫 Loading initial items to Candy Machine...', 'candy-machine', 40);
                await this.addItemsToCandyMachine(candyMachineAddress, collection, 10);
                this.emitProgress('✅ Initial items loaded!', 'candy-machine', 100);
            }

            return candyMachineAddress;
        } catch (error) {
            console.error('❌ Error creating Candy Machine:', error);
            throw new Error(`Failed to create Candy Machine: ${(error as Error).message}`);
        }
    }

    /**
     * Добавляет NFT items в Candy Machine
     * @param candyMachineAddress - Адрес Candy Machine
     * @param collection - Коллекция с параметрами
     * @param minRequired - Минимальное количество items (если не указано, загружаются ВСЕ items)
     */
    async addItemsToCandyMachine(candyMachineAddress: string, collection: SolanaCollection, minRequired?: number): Promise<void> {
        try {
            const umi = this.solanaService.getUmi();

            const candyMachine = await fetchCandyMachine(umi, toUmiPublicKey(candyMachineAddress));

            const currentLoaded = Number(candyMachine.itemsLoaded);
            const totalAvailable = Number(candyMachine.data.itemsAvailable);

            // Если minRequired не указан, загружаем ВСЕ доступные items
            const targetLoad = minRequired !== undefined
                ? Math.min(minRequired + 5, totalAvailable)
                : totalAvailable;

            if (currentLoaded >= targetLoad) {
                console.log(`✅ Candy Machine has enough items: ${currentLoaded}/${targetLoad}`);
                return;
            }

            const itemsNeeded = targetLoad - currentLoaded;
            const items: ConfigLine[] = [];

            // Генерируем config lines для всех необходимых items
            for (let i = 0; i < itemsNeeded; i++) {
                const ticketNum = currentLoaded + i + 1;
                items.push({
                    name: String(ticketNum).padStart(3, '0'),
                    uri: getTicketMetadataUri(collection.id, String(ticketNum)),
                });
            }

            console.log(`🎫 Adding ${items.length} items (${currentLoaded} → ${targetLoad})...`);
            this.emitProgress(`🎫 Preparing ${items.length} ticket items...`, 'items', 0);

            // Загружаем items пакетами по 10
            const batchSize = 10;
            const totalBatches = Math.ceil(items.length / batchSize);

            for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize);
                const batchNum = Math.floor(i / batchSize) + 1;
                const progress = Math.floor((batchNum / totalBatches) * 100);

                console.log(`🎫 Batch ${batchNum}/${totalBatches} (${batch.length} items)...`);
                this.emitProgress(`🎫 Adding batch ${batchNum}/${totalBatches} (${batch.length} items)...`, 'items', progress);

                await (await addConfigLines(umi, {
                    candyMachine: toUmiPublicKey(candyMachineAddress),
                    index: currentLoaded + i,
                    configLines: batch,
                })).sendAndConfirm(umi);
            }

            console.log(`✅ Added ${items.length} items successfully!`);
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

            const umi = this.solanaService.getUmi();

            const candyMachine = await fetchCandyMachine(umi, toUmiPublicKey(collection.candyMachineAddress));

            const itemsLoaded = Number(candyMachine.itemsLoaded);
            const itemsAvailable = Number(candyMachine.data.itemsAvailable);
            const ticketsSold = collection.ticketsSold || 0;

            console.log(`🔍 Candy Machine: ${itemsLoaded}/${itemsAvailable} items, ${ticketsSold} tickets sold`);

            const requiredItems = ticketsSold + quantity;
            if (itemsLoaded < requiredItems) {
                console.log(`📦 Need ${requiredItems} items, have ${itemsLoaded} - adding more...`);
                await this.addItemsToCandyMachine(collection.candyMachineAddress, collection, requiredItems);
            }

            if (quantity > 1) {
                console.log('⚠️ Warning: Multiple tickets require multiple transactions. Preparing first ticket...');
            }

            // const candyGuard = (candyMachine as any).candyGuard;
            // if (candyGuard?.guards?.solPayment) {
            //     const priceInLamports = Number(candyGuard.guards.solPayment.lamports.basisPoints);
            //     const priceInSol = priceInLamports / 1e9;
            //     console.log(`💰 Ticket price from guard: ${priceInSol} SOL (${priceInLamports} lamports)`);
            //     console.log(`💳 Payment destination: ${candyGuard.guards.solPayment.destination}`);
            // }

            const nftMint = generateSigner(umi);

            const nftMintAddress = nftMint.publicKey as string;
            console.log('🎫 Generated NFT Mint address:', nftMintAddress);

            const priceInLamports = BigInt(Math.floor(collection.ticketPrice * 1e9));

            const mintBuilder = transactionBuilder()
                .add(setComputeUnitLimit(umi, { units: 800_000 }))
                .add(
                    mintV2(umi, {
                        candyMachine: toUmiPublicKey(collection.candyMachineAddress),
                        nftMint,
                        collectionMint: toUmiPublicKey(collection.collectionNftAddress!),
                        collectionUpdateAuthority: umi.identity.publicKey,
                        mintArgs: {
                            solPayment: some({
                                lamports: lamports(priceInLamports),
                                destination: toUmiPublicKey(organizerPublicKey.toBase58()),
                            }),
                        },
                    })
                );

            console.log('🔍 Building transaction...');
            const builtTransaction = await mintBuilder.buildWithLatestBlockhash(umi);

            console.log('🔏 Backend signing with NFT mint + collection authority...');
            const nftMintSigned = await nftMint.signTransaction(builtTransaction);
            const fullySigned = await umi.identity.signTransaction(nftMintSigned);

            const serializedTx = umi.transactions.serialize(fullySigned);
            const base64Transaction = Buffer.from(serializedTx).toString('base64');

            console.log('✅ Transaction signed by backend');
            console.log('📤 Ready for user to sign and pay');

            return {
                transaction: base64Transaction,
                candyMachineAddress: collection.candyMachineAddress,
                nftMintAddress,
            };
        } catch (error) {
            console.error('❌ Error preparing mint transaction:', error);
            throw new Error(`Failed to prepare mint transaction: ${(error as Error).message}`);
        }
    }

    async getCandyMachineInfo(candyMachineAddress: string) {
        try {
            const umi = this.solanaService.getUmi();

            const candyMachine = await fetchCandyMachine(umi, toUmiPublicKey(candyMachineAddress));

            return {
                address: candyMachineAddress,
                itemsMinted: Number('itemsRedeemed' in candyMachine ? candyMachine.itemsRedeemed : 0),
                itemsAvailable: Number(candyMachine.data.itemsAvailable),
                itemsLoaded: Number(candyMachine.itemsLoaded),
            };
        } catch (error) {
            console.error('Error getting Candy Machine info:', error);
            throw new Error(`Failed to get Candy Machine info: ${(error as Error).message}`);
        }
    }

    async getUserTickets(_userWallet: string, _collectionId?: string): Promise<unknown[]> {
        throw new Error('getUserTickets not yet implemented with Umi');
    }

    async validateTicket(_nftAddress: string, _collectionId: string): Promise<boolean> {
        throw new Error('validateTicket not yet implemented with Umi');
    }
}
