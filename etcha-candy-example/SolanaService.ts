import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js';
import { PlatformConfig } from '../types';

export class SolanaService {
  private connection: Connection;
  private metaplex: Metaplex;
  private keypair: Keypair;

  constructor(config: PlatformConfig) {
    this.connection = new Connection(config.solana.rpcUrl, {
      commitment: config.solana.commitment as any,
    });

    // Initialize keypair from environment variable
    const privateKey = process.env.SOLANA_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('SOLANA_PRIVATE_KEY environment variable is required');
    }

    // Convert private key string to Keypair
    const privateKeyArray = JSON.parse(privateKey);
    this.keypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));

    this.metaplex = Metaplex.make(this.connection)
      .use(keypairIdentity(this.keypair));

    console.log('Solana service initialized with wallet:', this.keypair.publicKey.toString());
  }

  getConnection(): Connection {
    return this.connection;
  }

  getMetaplex(): Metaplex {
    return this.metaplex;
  }

  createMetaplexForUser(userKeypair: Keypair): Metaplex {
    return Metaplex.make(this.connection)
      .use(keypairIdentity(userKeypair));
  }

  getKeypair(): Keypair {
    return this.keypair;
  }

  getWalletAddress(): string {
    return this.keypair.publicKey.toString();
  }

  async getBalance(): Promise<number> {
    const balance = await this.connection.getBalance(this.keypair.publicKey);
    return balance / 1e9; // Convert lamports to SOL
  }

  async isWalletValid(address: string): Promise<boolean> {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
}