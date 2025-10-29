/**
 * Key Derivation Utilities
 * Derives a deterministic keypair from user signature + server salt
 */

/**
 * Derive seed from user signature, public key, and server salt
 * This creates a deterministic keypair that both client and server can generate
 */
export async function deriveSeedFromSignature(
    signature: Uint8Array,
    userPublicKey: string,
    salt: string
): Promise<Uint8Array> {
    // Combine signature, publicKey, and salt
    const message = `${userPublicKey}:${Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('')}:${salt}`
    
    // Use Web Crypto API for deterministic hashing
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    
    // Convert to Uint8Array and take first 32 bytes for seed
    const hashArray = new Uint8Array(hashBuffer)
    return hashArray.slice(0, 32)
}

/**
 * Convert seed to base58 for display (temporary for testing)
 */
export function seedToBase58(seed: Uint8Array): string {
    // Simple hex encoding for now (will use bs58 later)
    return Array.from(seed)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}

