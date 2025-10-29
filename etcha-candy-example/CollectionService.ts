import fs from 'fs';
import path from 'path';
import { Collection, CreateCollectionRequest } from '../types';

export class CollectionService {
  private collectionsPath: string;

  constructor() {
    this.collectionsPath = path.join(process.cwd(), 'data', 'collections.json');
    this.ensureDataFile();
  }

  private ensureDataFile(): void {
    const dataDir = path.dirname(this.collectionsPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.collectionsPath)) {
      fs.writeFileSync(this.collectionsPath, JSON.stringify({ collections: [] }, null, 2));
    }
  }

  private readCollections(): { collections: Collection[] } {
    try {
      const data = fs.readFileSync(this.collectionsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading collections:', error);
      return { collections: [] };
    }
  }

  private writeCollections(collections: Collection[]): void {
    try {
      fs.writeFileSync(this.collectionsPath, JSON.stringify({ collections }, null, 2));
    } catch (error) {
      console.error('Error writing collections:', error);
      throw new Error('Failed to save collections');
    }
  }

  async createCollection(data: CreateCollectionRequest, candyMachineService: any): Promise<Collection> {
    const collections = this.readCollections();
    
    const collection: Collection = {
      id: this.generateId(),
      ...data,
      candyMachineAddress: undefined,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create Collection NFT on blockchain
    try {
      console.log('Creating Collection NFT for:', collection.name);
      const collectionNftAddress = await candyMachineService.createCollectionNFT(collection);
      
      // Update collection with NFT address
      collection.collectionNftAddress = collectionNftAddress;
      
      console.log('Collection NFT created successfully:', collectionNftAddress);
    } catch (error) {
      console.error('Failed to create Collection NFT:', error);
      // Still save the collection even if NFT creation fails
      // In production, you might want to handle this differently
    }

    collections.collections.push(collection);
    this.writeCollections(collections.collections);

    return collection;
  }

  async getCollections(): Promise<Collection[]> {
    const collections = this.readCollections();
    return collections.collections;
  }

  async getCollectionById(id: string): Promise<Collection | null> {
    const collections = this.readCollections();
    return collections.collections.find(c => c.id === id) || null;
  }

  async updateCollection(id: string, updates: Partial<Collection>): Promise<Collection | null> {
    const collections = this.readCollections();
    const index = collections.collections.findIndex(c => c.id === id);
    
    if (index === -1) {
      return null;
    }

    collections.collections[index] = {
      ...collections.collections[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.writeCollections(collections.collections);
    return collections.collections[index];
  }

  async deleteCollection(id: string): Promise<boolean> {
    const collections = this.readCollections();
    const initialLength = collections.collections.length;
    
    collections.collections = collections.collections.filter(c => c.id !== id);
    
    if (collections.collections.length < initialLength) {
      this.writeCollections(collections.collections);
      return true;
    }
    
    return false;
  }

  private generateId(): string {
    return `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}