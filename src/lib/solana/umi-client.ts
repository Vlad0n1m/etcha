import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters'
import { mplCandyMachine } from '@metaplex-foundation/mpl-candy-machine'
import type { WalletAdapter } from '@solana/wallet-adapter-base'

/**
 * Create Umi client with Wallet Adapter integration
 * Used for frontend minting directly from Candy Machine
 */
export function createUmiClient(wallet: WalletAdapter, rpcUrl?: string) {
    const umi = createUmi(rpcUrl || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com')
        .use(walletAdapterIdentity(wallet))
        .use(mplCandyMachine())

    return umi
}

