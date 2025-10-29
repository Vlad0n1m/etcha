import { PublicKey, Keypair } from '@solana/web3.js';
import { lamports, amount, toPublicKey } from '@metaplex-foundation/js';
import { Collection, CandyMachineConfig, TestWallet } from '../types';
import { SolanaService } from './SolanaService';
import { CollectionService } from './CollectionService';
import fs from 'fs';
import path from 'path';

export class CandyMachineService {
  private solanaService: SolanaService;
  private collectionService: CollectionService;
  private testWallets: TestWallet[];

  constructor(solanaService: SolanaService, collectionService: CollectionService) {
    this.solanaService = solanaService;
    this.collectionService = collectionService;
    this.testWallets = this.loadTestWallets();
  }

  private loadTestWallets(): TestWallet[] {
    try {
      const walletsPath = path.join(process.cwd(), 'data', 'test-wallets.json');
      const data = fs.readFileSync(walletsPath, 'utf8');
      const parsed = JSON.parse(data);
      return parsed.testWallets || [];
    } catch (error) {
      console.error('Error loading test wallets:', error);
      return [];
    }
  }

  private getTestWallet(walletAddress: string): TestWallet | null {
    return this.testWallets.find(w => w.wallet === walletAddress) || null;
  }

  private createKeypairFromPrivateKey(privateKey: number[]): Keypair {
    return Keypair.fromSecretKey(new Uint8Array(privateKey));
  }

  async createCollectionNFT(collection: Collection): Promise<string> {
    try {
      console.log('🎨 Starting Collection NFT creation...');
      console.log('Collection data:', {
        name: collection.name,
        eventCreator: collection.eventCreator,
        wallet: this.solanaService.getWalletAddress()
      });

      const metaplex = this.solanaService.getMetaplex();
      
      // Check wallet balance first
      const balance = await this.solanaService.getBalance();
      console.log('💰 Wallet balance:', balance, 'SOL');
      
      if (balance < 0.01) {
        throw new Error('Insufficient SOL balance for transaction');
      }
      
      console.log('🎨 Creating Collection NFT with URI metadata...');
      
      // Create metadata URI (our API endpoint)
      const metadataUri = `https://api.etcha-candy.com/metadata/${collection.id}`;
      
      // Create Collection NFT with URI metadata (no upload to Bundlr)
      const collectionNft = await metaplex.nfts().create({
        name: collection.name,
        symbol: collection.name.substring(0, 4).toUpperCase(),
        uri: metadataUri, // Our API endpoint for metadata
        sellerFeeBasisPoints: 250, // 2.5% royalty
        creators: [
          {
            address: this.solanaService.getKeypair().publicKey,
            share: 100, // 100% to platform
          }
        ],
        isCollection: true,
      });

      console.log('🎉 Collection NFT created successfully!');
      console.log('NFT Address:', collectionNft.nft.address.toString());
      console.log('NFT Symbol:', collectionNft.nft.symbol);
      console.log('Metadata URI:', metadataUri);
      
      return collectionNft.nft.address.toString();
    } catch (error) {
      console.error('❌ Error creating Collection NFT:', error);
      console.error('Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      throw new Error(`Failed to create Collection NFT: ${(error as Error).message}`);
    }
  }

  async createCandyMachine(collection: Collection): Promise<string> {
    try {
      console.log('🍭 Creating Candy Machine for collection:', collection.name);
      
      if (!collection.collectionNftAddress) {
        throw new Error('Collection NFT must be created before Candy Machine');
      }

      const metaplex = this.solanaService.getMetaplex();
      
      // Check wallet balance
      const balance = await this.solanaService.getBalance();
      console.log('💰 Platform wallet balance:', balance, 'SOL');
      
      if (balance < 0.1) {
        throw new Error('Insufficient SOL balance for Candy Machine creation');
      }

      // Create Candy Machine configuration
      const candyMachineConfig = {
        price: collection.ticketPrice,
        number: collection.maxTickets,
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
        // Use URI-based metadata for each ticket
        uri: `https://api.etcha-candy.com/ticket-metadata/${collection.id}`,
      };

      console.log('🍭 Creating Candy Machine with config:', {
        price: candyMachineConfig.price,
        number: candyMachineConfig.number,
        collection: collection.collectionNftAddress
      });

      console.log('🔍 Debug - collection.ticketPrice:', collection.ticketPrice);
      console.log('🔍 Debug - candyMachineConfig.price:', candyMachineConfig.price);
      console.log('🔍 Debug - typeof candyMachineConfig.price:', typeof candyMachineConfig.price);

      // Create Candy Machine using the correct API for our SDK version
      const candyMachine = await metaplex.candyMachines().create({
        itemsAvailable: candyMachineConfig.number,
        sellerFeeBasisPoints: candyMachineConfig.sellerFeeBasisPoints,
        symbol: candyMachineConfig.symbol,
        creators: candyMachineConfig.creators,
        collection: candyMachineConfig.collection,
        // Set price through guards
        guards: {
          solPayment: {
            amount: {
              basisPoints: BigInt(Math.floor(candyMachineConfig.price * 1e9)), // Convert SOL to lamports
              currency: {
                symbol: 'SOL',
                decimals: 9,
              },
            },
            destination: this.solanaService.getKeypair().publicKey,
          },
        },
      });

      console.log('🎉 Candy Machine created successfully!');
      console.log('Candy Machine object:', JSON.stringify(candyMachine, null, 2));
      console.log('Candy Machine keys:', Object.keys(candyMachine));
      
      // ✅ Правильное извлечение адреса - используем нашу функцию
      console.log('Trying to extract address from:', {
        candyMachine: candyMachine.candyMachine
      });
      
      const candyMachineAddress = this.asBase58Address(candyMachine.candyMachine);
      
      // Runtime проверка что адрес валидный base58
      if (!(typeof candyMachineAddress === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(candyMachineAddress))) {
        throw new Error('CandyMachine address must be a base58 string');
      }
      
      console.log('Candy Machine Address:', candyMachineAddress);
      
      // 🎯 Добавляем элементы в Candy Machine
      console.log('🎫 Adding items to Candy Machine...');
      await this.addItemsToCandyMachine(candyMachineAddress, collection);
      
      return candyMachineAddress;
    } catch (error) {
      console.error('❌ Error creating Candy Machine:', error);
      console.error('Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      throw new Error(`Failed to create Candy Machine: ${(error as Error).message}`);
    }
  }

  async mintTicket(collectionId: string, userWallet: string, quantity: number = 1): Promise<{nftAddresses: string[], ticketNumbers: string[]}> {
    try {
      console.log('🎫 Starting ticket minting...');
      console.log('Collection ID:', collectionId);
      console.log('User Wallet:', userWallet);
      console.log('Quantity:', quantity);
      console.log('🔍 Expected Candy Machine address:', 'jUn8Z1kLAqM3nKsdThPzRs6vNNQaCd6YTav9xMv8Q5G');

      const collection = await this.getCollectionById(collectionId);
      
      if (!collection) {
        throw new Error('Collection not found');
      }

      // Check if Candy Machine exists, create if not (lazy loading)
      if (!collection.candyMachineAddress || collection.candyMachineAddress === '[object Object]') {
        console.log('🍭 Candy Machine not found or invalid, creating...');
        console.log('Current candyMachineAddress:', collection.candyMachineAddress);
        
        const candyMachineAddress = await this.createCandyMachine(collection);
        
        // Update collection with Candy Machine address
        await this.collectionService.updateCollection(collectionId, {
          candyMachineAddress,
          candyMachineConfig: {
            price: collection.ticketPrice,
            supply: collection.maxTickets,
            minted: 0,
            isActive: true,
            createdAt: new Date().toISOString()
          }
        });
        
        // Reload collection with updated data
        const updatedCollection = await this.getCollectionById(collectionId);
        if (!updatedCollection) {
          throw new Error('Failed to update collection with Candy Machine');
        }
        collection.candyMachineAddress = candyMachineAddress;
      }

      // Get test wallet for minting
      const testWallet = this.getTestWallet(userWallet);
      if (!testWallet) {
        throw new Error('Test wallet not found');
      }

      const userKeypair = this.createKeypairFromPrivateKey(testWallet.privateKey);
      
      // Create Metaplex instance for the user's wallet
      const userMetaplex = this.solanaService.createMetaplexForUser(userKeypair);

      // Check user wallet balance
      const userBalance = await this.solanaService.getConnection().getBalance(userKeypair.publicKey);
      const userBalanceSOL = userBalance / 1e9;
      console.log('💰 User wallet balance:', userBalanceSOL, 'SOL');
      console.log('👤 User wallet address:', userKeypair.publicKey.toBase58());

      if (userBalanceSOL < collection.ticketPrice * quantity) {
        throw new Error(`Insufficient SOL balance. Required: ${collection.ticketPrice * quantity} SOL, Available: ${userBalanceSOL} SOL`);
      }

      const mintedNfts: string[] = [];
      const ticketNumbers: string[] = [];

      // Mint tickets one by one
      for (let i = 0; i < quantity; i++) {
        console.log(`🎫 Minting ticket ${i + 1}/${quantity}...`);
        
        console.log('🔍 Looking for Candy Machine at address:', collection.candyMachineAddress);
        console.log('🔍 Address type:', typeof collection.candyMachineAddress);
        
        // ✅ Используем адрес напрямую - он уже строка
        const candyMachineAddress = collection.candyMachineAddress!;
        console.log('✅ Using Candy Machine address:', candyMachineAddress);
        
        console.log('🔍 Creating PublicKey from:', candyMachineAddress);
        const candyMachinePublicKey = new PublicKey(candyMachineAddress);
        console.log('🔍 PublicKey created successfully:', candyMachinePublicKey.toBase58());
        
        console.log('🔍 Searching for Candy Machine on blockchain...');
        const candyMachine = await userMetaplex.candyMachines().findByAddress({
          address: candyMachinePublicKey,
        });
        console.log('✅ Candy Machine found on blockchain!');

        // Mint NFT - правильный вызов для @metaplex-foundation/js@0.19.0
        const mintResult = await userMetaplex.candyMachines().mint({
          candyMachine,
          collectionUpdateAuthority: this.solanaService.getKeypair().publicKey, // Signer владельца коллекции
        });

        const nftAddress = mintResult.nft.address.toString();
        const ticketNumber = String(collection.candyMachineConfig?.minted || 0 + i + 1).padStart(3, '0');
        
        mintedNfts.push(nftAddress);
        ticketNumbers.push(ticketNumber);
        
        console.log(`✅ Ticket ${ticketNumber} minted: ${nftAddress}`);
      }

      // Update minted count
      const currentMinted = collection.candyMachineConfig?.minted || 0;
      await this.collectionService.updateCollection(collectionId, {
        candyMachineConfig: {
          ...collection.candyMachineConfig!,
          minted: currentMinted + quantity
        }
      });

      console.log('🎉 All tickets minted successfully!');
      console.log('Minted NFTs:', mintedNfts);
      console.log('Ticket Numbers:', ticketNumbers);

      return { nftAddresses: mintedNfts, ticketNumbers };
    } catch (error) {
      console.error('❌ Error minting ticket:', error);
      console.error('Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      throw new Error(`Failed to mint ticket: ${(error as Error).message}`);
    }
  }

  async getCandyMachineInfo(candyMachineAddress: string): Promise<any> {
    try {
      const metaplex = this.solanaService.getMetaplex();
      
      const candyMachine = await metaplex.candyMachines().findByAddress({
        address: new PublicKey(candyMachineAddress),
      });

      return {
        address: candyMachineAddress,
        itemsMinted: candyMachine.itemsMinted,
        itemsAvailable: candyMachine.itemsAvailable,
        price: 0, // Price is now handled by guards
        isFullyLoaded: candyMachine.isFullyLoaded,
        isActive: true, // Default to active
        symbol: candyMachine.symbol,
        sellerFeeBasisPoints: candyMachine.sellerFeeBasisPoints,
      };
    } catch (error) {
      console.error('Error getting Candy Machine info:', error);
      throw new Error(`Failed to get Candy Machine info: ${(error as Error).message}`);
    }
  }

  async getTestWallets(): Promise<TestWallet[]> {
    return this.testWallets;
  }

  async getUserTickets(userWallet: string, collectionId?: string): Promise<any[]> {
    try {
      const testWallet = this.getTestWallet(userWallet);
      if (!testWallet) {
        throw new Error('Test wallet not found');
      }

      const userKeypair = this.createKeypairFromPrivateKey(testWallet.privateKey);
      const metaplex = this.solanaService.getMetaplex();

      // Get all NFTs owned by the user
      const nfts = await metaplex.nfts().findAllByOwner({
        owner: userKeypair.publicKey,
      });

      // Filter by collection if specified
      if (collectionId) {
        const collection = await this.getCollectionById(collectionId);
        if (collection?.collectionNftAddress) {
          const collectionAddress = new PublicKey(collection.collectionNftAddress);
          return nfts
            .filter(nft => nft.collection?.address.equals(collectionAddress))
            .map(nft => ({
              nftAddress: nft.address.toString(),
              solscanUrl: `https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`,
              name: nft.name,
              symbol: nft.symbol,
              collection: nft.collection?.address.toString()
            }));
        }
      }

      // Filter by our platform wallet (creators) - check if our wallet is in creators list
      const platformWallet = this.solanaService.getKeypair().publicKey;
      return nfts
        .filter(nft => 
          nft.creators?.some(creator => 
            creator.address.equals(platformWallet)
          )
        )
        .map(nft => ({
          nftAddress: nft.address.toString(),
          solscanUrl: `https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`,
          name: nft.name,
          symbol: nft.symbol,
          collection: nft.collection?.address.toString()
        }));
    } catch (error) {
      console.error('Error getting user tickets:', error);
      throw new Error(`Failed to get user tickets: ${(error as Error).message}`);
    }
  }

  async getUserTicketsFromPlatform(userWallet: string): Promise<any[]> {
    try {
      const testWallet = this.getTestWallet(userWallet);
      if (!testWallet) {
        throw new Error('Test wallet not found');
      }

      const userKeypair = this.createKeypairFromPrivateKey(testWallet.privateKey);
      const metaplex = this.solanaService.getMetaplex();

      // Get all NFTs owned by the user
      const nfts = await metaplex.nfts().findAllByOwner({
        owner: userKeypair.publicKey,
      });

      // Filter by our platform wallet (creators) - check if our wallet is in creators list
      const platformWallet = this.solanaService.getKeypair().publicKey;
      return nfts
        .filter(nft => 
          nft.creators?.some(creator => 
            creator.address.equals(platformWallet)
          )
        )
        .map(nft => ({
          nftAddress: nft.address.toString(),
          solscanUrl: `https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`,
          name: nft.name,
          symbol: nft.symbol,
          collection: nft.collection?.address.toString()
        }));
    } catch (error) {
      console.error('Error getting user tickets from platform:', error);
      throw new Error(`Failed to get user tickets from platform: ${(error as Error).message}`);
    }
  }

  async validateTicket(nftAddress: string, collectionId: string): Promise<boolean> {
    try {
      const metaplex = this.solanaService.getMetaplex();
      
      const nft = await metaplex.nfts().findByMint({
        mintAddress: new PublicKey(nftAddress),
      });

      // Check if NFT exists and has valid metadata
      if (!nft) {
        return false;
      }

      // Additional validation can be added here
      // For now, just check if NFT exists
      return true;
    } catch (error) {
      console.error('Error validating ticket:', error);
      return false;
    }
  }

  private async getCollectionById(collectionId: string): Promise<Collection | null> {
    return await this.collectionService.getCollectionById(collectionId);
  }

  async addItemsToCandyMachine(candyMachineAddress: string, collection: Collection): Promise<void> {
    try {
      const metaplex = this.solanaService.getMetaplex();
      
      // Получаем Candy Machine
      const candyMachine = await metaplex.candyMachines().findByAddress({
        address: new PublicKey(candyMachineAddress),
      });
      
      console.log('🎫 Adding items to Candy Machine...');
      
      // Создаем элементы для каждого билета
      const items = Array.from({ length: collection.maxTickets }, (_, i) => ({
        name: `Ticket #${String(i + 1).padStart(3, '0')}`, // Shortened name to fit 32 char limit
        uri: `https://api.etcha-candy.com/ticket-metadata/${collection.id}/${i + 1}`,
      }));
      
      console.log(`🎫 Adding ${items.length} items to Candy Machine...`);
      
      // Добавляем элементы пакетами по 5 штук, чтобы избежать ошибки "Transaction too large"
      const batchSize = 5;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        console.log(`🎫 Adding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)} (${batch.length} items)...`);
        
        await metaplex.candyMachines().insertItems({
          candyMachine,
          items: batch,
        });
        
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} added successfully!`);
      }
      
      console.log('✅ All items added to Candy Machine successfully!');
    } catch (error) {
      console.error('❌ Error adding items to Candy Machine:', error);
      throw new Error(`Failed to add items to Candy Machine: ${(error as Error).message}`);
    }
  }

  // ✅ Функция для безопасного извлечения base58 адреса
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
    if (x && typeof x === 'object' && 'toBase58' in x && typeof (x as any).toBase58 === 'function') {
      return (x as any).toBase58();
    }
    
    // если это объект с публичным ключом
    if (x && typeof x === 'object') {
      // попробуем найти публичный ключ в объекте
      const obj = x as any;
      if (obj.publicKey && 'toBase58' in obj.publicKey && typeof obj.publicKey.toBase58 === 'function') {
        return obj.publicKey.toBase58();
      }
      if (obj.address && 'toBase58' in obj.address && typeof obj.address.toBase58 === 'function') {
        return obj.address.toBase58();
      }
      if (obj.pubkey && 'toBase58' in obj.pubkey && typeof obj.pubkey.toBase58 === 'function') {
        return obj.pubkey.toBase58();
      }
      // если pubkey это строка
      if (obj.pubkey && typeof obj.pubkey === 'string') {
        return obj.pubkey;
      }
      // если pubkey это объект с публичным ключом
      if (obj.pubkey && typeof obj.pubkey === 'object') {
        if (obj.pubkey.publicKey && 'toBase58' in obj.pubkey.publicKey && typeof obj.pubkey.publicKey.toBase58 === 'function') {
          return obj.pubkey.publicKey.toBase58();
        }
        if (obj.pubkey.address && 'toBase58' in obj.pubkey.address && typeof obj.pubkey.address.toBase58 === 'function') {
          return obj.pubkey.address.toBase58();
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

  // ==========================================
  // AUCTION HOUSE METHODS (Secondary Market)
  // ==========================================

  /**
   * Create Auction House instance for marketplace (one-time setup)
   */
  async createMarketplace(): Promise<string> {
    try {
      console.log('🏪 Creating Auction House marketplace...');
      const metaplex = this.solanaService.getMetaplex();
      
      const { auctionHouse } = await metaplex.auctionHouse().create({
        sellerFeeBasisPoints: 250, // 2.5% marketplace fee
        canChangeSalePrice: false,
      });
      
      console.log('✅ Auction House created successfully!');
      console.log('Auction House Address:', auctionHouse.address.toBase58());
      
      return auctionHouse.address.toBase58();
    } catch (error) {
      console.error('❌ Error creating Auction House:', error);
      throw new Error(`Failed to create marketplace: ${(error as Error).message}`);
    }
  }

  /**
   * List NFT for sale on marketplace
   */
  async listTicketForSale(
    auctionHouseAddress: string,
    nftMintAddress: string,
    priceInSol: number,
    userWallet: string
  ): Promise<{ listingAddress: string; price: number }> {
    try {
      console.log('🏷️ Listing NFT for sale...');
      console.log('Auction House:', auctionHouseAddress);
      console.log('NFT:', nftMintAddress);
      console.log('Price:', priceInSol, 'SOL');
      
      const testWallet = this.getTestWallet(userWallet);
      if (!testWallet) {
        throw new Error('Wallet not found');
      }
      
      const userKeypair = this.createKeypairFromPrivateKey(testWallet.privateKey);
      const userMetaplex = this.solanaService.createMetaplexForUser(userKeypair);
      
      // Get Auction House model
      const auctionHouse = await userMetaplex.auctionHouse().findByAddress({
        address: new PublicKey(auctionHouseAddress),
      });
      
      // Get the seller wallet address
      const sellerAddress = userKeypair.publicKey;
      
      // List NFT for sale
      console.log('🔍 Creating listing for NFT:', nftMintAddress);
      console.log('   Seller:', sellerAddress.toBase58());
      
      const { listing } = await userMetaplex.auctionHouse().list({
        auctionHouse,
        mintAccount: new PublicKey(nftMintAddress),
        seller: userKeypair,
        price: lamports(priceInSol * 1e9), // Convert SOL to lamports
      });
      
      console.log('✅ NFT listed successfully!');
      console.log('Listing Address:', listing.tradeStateAddress.toBase58());
      
      return {
        listingAddress: listing.tradeStateAddress.toBase58(),
        price: priceInSol,
      };
    } catch (error) {
      console.error('❌ Error listing NFT:', error);
      throw new Error(`Failed to list NFT: ${(error as Error).message}`);
    }
  }

  /**
   * Buy NFT from marketplace (instant purchase)
   */
  async buyTicketFromMarketplace(
    auctionHouseAddress: string,
    listingAddress: string,
    userWallet: string
  ): Promise<{ purchaseAddress: string; nftAddress: string }> {
    try {
      console.log('🛒 Buying NFT from marketplace...');
      console.log('Auction House:', auctionHouseAddress);
      console.log('Listing:', listingAddress);
      
      const testWallet = this.getTestWallet(userWallet);
      if (!testWallet) {
        throw new Error('Wallet not found');
      }
      
      const userKeypair = this.createKeypairFromPrivateKey(testWallet.privateKey);
      const userMetaplex = this.solanaService.createMetaplexForUser(userKeypair);
      
      // Get Auction House model
      const auctionHouse = await userMetaplex.auctionHouse().findByAddress({
        address: new PublicKey(auctionHouseAddress),
      });
      
      // Find the listing
      const lazyListing = await userMetaplex.auctionHouse().findListingByTradeState({
        auctionHouse,
        tradeStateAddress: new PublicKey(listingAddress),
      });
      
      // Load the full listing
      const listing = (lazyListing as any).model !== 'listing' 
        ? await userMetaplex.auctionHouse().loadListing({ lazyListing } as any)
        : lazyListing;
      
      console.log('💰 Listing price:', listing.price.basisPoints.toNumber() / 1e9, 'SOL');
      
      // Check buyer balance
      const buyerBalance = await this.solanaService.getConnection().getBalance(userKeypair.publicKey);
      const buyerBalanceSOL = buyerBalance / 1e9;
      const listingPrice = listing.price.basisPoints.toNumber() / 1e9;
      
      if (buyerBalanceSOL < listingPrice) {
        throw new Error(`Insufficient SOL balance. Required: ${listingPrice} SOL, Available: ${buyerBalanceSOL} SOL`);
      }
      
      // Create bid and execute sale directly
      const { purchase } = await userMetaplex.auctionHouse().buy({
        auctionHouse,
        listing,
        buyer: userKeypair,
      });
      
      console.log('✅ NFT purchased successfully!');
      
      // Get NFT address from the asset
      const nftAddress = (listing as any).asset.address.toBase58();
      console.log('NFT Address:', nftAddress);
      
      return {
        purchaseAddress: (purchase as any).receiptAddress?.toBase58() || 'purchase-receipt',
        nftAddress: nftAddress,
      };
    } catch (error) {
      console.error('❌ Error buying NFT:', error);
      throw new Error(`Failed to buy NFT: ${(error as Error).message}`);
    }
  }

  /**
   * Get all active listings from marketplace
   */
  async getActiveListings(auctionHouseAddress: string): Promise<any[]> {
    try {
      const metaplex = this.solanaService.getMetaplex();
      
      // Get Auction House model
      const auctionHouse = await metaplex.auctionHouse().findByAddress({
        address: new PublicKey(auctionHouseAddress),
      });
      
      const listings = await metaplex.auctionHouse().findListings({
        auctionHouse,
      });
      
      // Load full listing details for each lazy listing
      const loadedListings = await Promise.all(
        listings.map(async (lazyListing: any) => {
          if (lazyListing.model === 'listing') {
            return lazyListing;
          }
          return await metaplex.auctionHouse().loadListing({ lazyListing } as any);
        })
      );
      
      return loadedListings.map((listing: any) => ({
        listingAddress: listing.tradeStateAddress.toBase58(),
        nftAddress: (listing.asset as any)?.address?.toBase58() || listing.metadataAddress?.toBase58() || 'unknown',
        price: listing.price.basisPoints.toNumber() / 1e9, // Convert to SOL
        seller: listing.sellerAddress.toBase58(),
        createdAt: listing.createdAt,
      }));
    } catch (error) {
      console.error('Error getting listings:', error);
      throw new Error(`Failed to get listings: ${(error as Error).message}`);
    }
  }
}