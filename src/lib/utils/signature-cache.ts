// Shared signature cache for AuthProvider and SignatureProvider
// This ensures only ONE signature is requested from the wallet at connection time

const SIGN_MESSAGE_TEXT = 'etcha-mint-auth-v1'

export { SIGN_MESSAGE_TEXT }

const globalSignatureCache = new Map<string, Uint8Array>()
const signatureRequestCache = new Map<string, Promise<Uint8Array>>()

export function uint8ToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function hexToUint8(hex: string): Uint8Array {
    return new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
}

/**
 * Get or request a signature from the wallet.
 * Uses global cache to prevent multiple signature requests.
 */
export async function getOrRequestSignature(
    storageKey: string,
    signMessage: (message: Uint8Array) => Promise<Uint8Array>,
    message?: string
): Promise<Uint8Array | null> {
    const messageToSign = message || SIGN_MESSAGE_TEXT

    // Try global cache first
    if (globalSignatureCache.has(storageKey)) {
        console.log('✅ Using signature from global cache')
        return globalSignatureCache.get(storageKey)!
    }

    // Try sessionStorage
    const cachedHex = sessionStorage.getItem(storageKey)
    if (cachedHex) {
        try {
            const signature = hexToUint8(cachedHex)
            globalSignatureCache.set(storageKey, signature)
            console.log('✅ Restored signature from sessionStorage')
            return signature
        } catch (e) {
            sessionStorage.removeItem(storageKey)
        }
    }

    // Check if there's already a pending request
    if (signatureRequestCache.has(storageKey)) {
        console.log('⏳ Waiting for signature request from another provider')
        try {
            return await signatureRequestCache.get(storageKey)!
        } catch {
            return null
        }
    }

    // Request new signature
    const promise = (async () => {
        try {
            const messageBytes = new TextEncoder().encode(messageToSign)
            const signature = await signMessage(messageBytes)
            
            // Cache it
            globalSignatureCache.set(storageKey, signature)
            sessionStorage.setItem(storageKey, uint8ToHex(signature))
            
            return signature
        } finally {
            signatureRequestCache.delete(storageKey)
        }
    })()

    signatureRequestCache.set(storageKey, promise)
    
    try {
        return await promise
    } catch {
        return null
    }
}

/**
 * Clear cached signature
 */
export function clearSignature(storageKey: string): void {
    sessionStorage.removeItem(storageKey)
    globalSignatureCache.delete(storageKey)
}

