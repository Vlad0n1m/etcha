import { Keypair, PublicKey, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js'
import bs58 from 'bs58'

/**
 * Load platform wallet keypair from environment variable
 * Supports both JSON array format [1,2,3,...] and base58 format
 */
export function loadPlatformWallet(): Keypair {
    const privateKey = process.env.PLATFORM_WALLET_PRIVATE_KEY

    if (!privateKey) {
        throw new Error('PLATFORM_WALLET_PRIVATE_KEY environment variable is not set')
    }

    try {
        // Try parsing as JSON array first
        if (privateKey.startsWith('[')) {
            const secretKey = Uint8Array.from(JSON.parse(privateKey))
            return Keypair.fromSecretKey(secretKey)
        }

        // Try parsing as base58
        const secretKey = bs58.decode(privateKey)
        return Keypair.fromSecretKey(secretKey)
    } catch {
        throw new Error('Failed to parse PLATFORM_WALLET_PRIVATE_KEY. Must be either JSON array or base58 string')
    }
}

/**
 * Load Candy Machine authority keypair from environment variable
 */
export function loadCandyMachineAuthority(): Keypair {
    const privateKey = process.env.CANDY_MACHINE_AUTHORITY_PRIVATE_KEY

    if (!privateKey) {
        // If not set, use platform wallet as authority
        console.warn('CANDY_MACHINE_AUTHORITY_PRIVATE_KEY not set, using platform wallet')
        return loadPlatformWallet()
    }

    try {
        if (privateKey.startsWith('[')) {
            const secretKey = Uint8Array.from(JSON.parse(privateKey))
            return Keypair.fromSecretKey(secretKey)
        }

        const secretKey = bs58.decode(privateKey)
        return Keypair.fromSecretKey(secretKey)
    } catch {
        throw new Error('Failed to parse CANDY_MACHINE_AUTHORITY_PRIVATE_KEY')
    }
}

/**
 * Validate if a string is a valid Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
    try {
        new PublicKey(address)
        return true
    } catch {
        return false
    }
}

/**
 * Get wallet balance in SOL
 */
export async function getWalletBalance(
    connection: Connection,
    address: string | PublicKey
): Promise<number> {
    const publicKey = typeof address === 'string' ? new PublicKey(address) : address
    const balance = await connection.getBalance(publicKey)
    return balance / LAMPORTS_PER_SOL
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): number {
    return Math.floor(sol * LAMPORTS_PER_SOL)
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: number): number {
    return lamports / LAMPORTS_PER_SOL
}

/**
 * Format wallet address for display (show first 4 and last 4 characters)
 */
export function formatWalletAddress(address: string): string {
    if (address.length < 8) return address
    return `${address.slice(0, 4)}...${address.slice(-4)}`
}

