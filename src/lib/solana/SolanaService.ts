import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createSignerFromKeypair, signerIdentity, Umi } from '@metaplex-foundation/umi';
import { mplCandyMachine } from '@metaplex-foundation/mpl-candy-machine';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { PlatformConfig, getPlatformConfig } from './config';

export class SolanaService {
    private connection: Connection;
    private umi: Umi;
    private keypair: Keypair;
    private config: PlatformConfig;

    constructor(config?: PlatformConfig) {
        this.config = config || getPlatformConfig();

        this.connection = new Connection(this.config.solana.rpcUrl, {
            commitment: this.config.solana.commitment as any,
        });

        // Initialize keypair from environment variable
        const privateKey = process.env.SOLANA_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('SOLANA_PRIVATE_KEY environment variable is required');
        }

        // Convert private key string to Keypair
        const privateKeyArray = JSON.parse(privateKey);
        this.keypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));

        // Initialize Umi with plugins
        this.umi = createUmi(this.config.solana.rpcUrl)
            .use(mplCandyMachine())
            .use(mplTokenMetadata());

        // Set identity for Umi
        const umiKeypair = this.umi.eddsa.createKeypairFromSecretKey(new Uint8Array(privateKeyArray));
        const umiSigner = createSignerFromKeypair(this.umi, umiKeypair);
        this.umi.use(signerIdentity(umiSigner));

        console.log('Solana service initialized with wallet:', this.keypair.publicKey.toString());
    }

    getConnection(): Connection {
        return this.connection;
    }

    getUmi(): Umi {
        return this.umi;
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

    getConfig(): PlatformConfig {
        return this.config;
    }
}

