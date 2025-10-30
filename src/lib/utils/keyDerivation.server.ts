/**
 * Server-Side Key Derivation Utilities
 * Derives a deterministic keypair from user signature + server salt
 */

import { Keypair } from '@solana/web3.js'
import * as crypto from 'crypto'
import bs58 from 'bs58'

/**
 * Derive seed from user signature, public key, and server salt
 * This creates a deterministic keypair that both client and server can generate
 */
export function deriveKeypairFromSignature(
    signature: string | Uint8Array,
    userPublicKey: string,
    salt: string
): Keypair {
    // Convert signature to consistent format
    let signatureBytes: Uint8Array
    if (typeof signature === 'string') {
        // If hex string, convert to bytes
        if (signature.startsWith('0x') || signature.length % 2 === 0) {
            signatureBytes = new Uint8Array(
                signature.replace(/^0x/, '').match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
            )
        } else {
            // If base58, decode
            signatureBytes = new Uint8Array(bs58.decode(signature))
        }
    } else {
        signatureBytes = signature
    }

    // Combine signature, publicKey, and salt
    const message = `${userPublicKey}:${Buffer.from(signatureBytes).toString('hex')}:${salt}`
    
    // Use Node.js crypto for deterministic hashing
    const hash = crypto.createHash('sha256').update(message).digest()
    
    // Take first 32 bytes for seed
    const seed = new Uint8Array(hash.slice(0, 32))
    
    // Create Keypair from seed
    return Keypair.fromSeed(seed)
}

/**
 * Get derivation salt from environment
 */
export function getDerivationSalt(): string {
    const salt = process.env.DERIVATION_SALT
    if (!salt) {
        throw new Error('DERIVATION_SALT environment variable is not set')
    }
    return salt
}

