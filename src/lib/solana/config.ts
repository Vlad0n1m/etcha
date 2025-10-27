export interface PlatformConfig {
    platform: {
        name: string;
        walletAddress: string;
        royalty: number;
        description: string;
    };
    solana: {
        network: string;
        rpcUrl: string;
        commitment: string;
    };
}

export function getPlatformConfig(): PlatformConfig {
    const network = process.env.SOLANA_NETWORK || 'devnet';
    const rpcUrl = process.env.SOLANA_RPC_URL ||
        (network === 'devnet'
            ? 'https://api.devnet.solana.com'
            : 'https://api.mainnet-beta.solana.com');

    return {
        platform: {
            name: 'Etcha Platform',
            walletAddress: '',
            royalty: 2.5,
            description: 'NFT ticket platform for events',
        },
        solana: {
            network,
            rpcUrl,
            commitment: 'confirmed',
        },
    };
}

