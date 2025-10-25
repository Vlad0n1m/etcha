import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'

export function verifyWalletSignature(
    message: string,
    signature: string,
    walletAddress: string
): boolean {
    try {
        const publicKey = new PublicKey(walletAddress)
        const messageBytes = new TextEncoder().encode(message)
        const signatureBytes = Uint8Array.from(Buffer.from(signature, 'base64'))
        const publicKeyBytes = publicKey.toBytes()

        const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
        return isValid
    } catch (error) {
        console.error('Error verifying signature:', error)
        return false
    }
}

export function createAuthMessage(walletAddress: string): string {
    const timestamp = Date.now()
    return `Sign this message to authenticate with Etcha: ${walletAddress}:${timestamp}`
}

export function parseAuthMessage(message: string): { walletAddress: string; timestamp: number } | null {
    const match = message.match(/Sign this message to authenticate with Etcha: ([^:]+):(\d+)/)

    if (!match) {
        return null
    }

    return {
        walletAddress: match[1],
        timestamp: parseInt(match[2])
    }
}
