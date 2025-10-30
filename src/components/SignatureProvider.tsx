"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

type SignatureContextType = {
    signature: Uint8Array | null
    derivedAddress: string | null
    isDeriving: boolean
    error: string | null
    refreshSignature: () => Promise<{ signature: Uint8Array; derivedAddress: string } | null>
    clear: () => void
}

const SignatureContext = createContext<SignatureContextType | undefined>(undefined)

const SIGN_MESSAGE_TEXT = 'etcha-mint-auth-v1'

function uint8ToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export const SignatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { connected, publicKey, signMessage } = useWallet()
    const [signature, setSignature] = useState<Uint8Array | null>(null)
    const [derivedAddress, setDerivedAddress] = useState<string | null>(null)
    const [isDeriving, setIsDeriving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const inFlightRef = React.useRef<Promise<{ signature: Uint8Array; derivedAddress: string } | null> | null>(null)

    const storageKey = useMemo(() => (publicKey ? `etcha:mint:signature:${publicKey.toBase58()}` : null), [publicKey])

    const clear = useCallback(() => {
        setSignature(null)
        setDerivedAddress(null)
        setError(null)
        if (storageKey) sessionStorage.removeItem(storageKey)
    }, [storageKey])

    const refreshSignature = useCallback(async (): Promise<{ signature: Uint8Array; derivedAddress: string } | null> => {
        if (inFlightRef.current) return inFlightRef.current
        if (!connected || !publicKey) {
            clear()
            return null
        }
        if (!signMessage) {
            setError('Wallet does not support message signing')
            return null
        }

        const promise = (async () => {
            setIsDeriving(true)
            setError(null)
            try {
                const messageBytes = new TextEncoder().encode(SIGN_MESSAGE_TEXT)
                const sig = await signMessage(messageBytes)
                setSignature(sig)

                if (storageKey) sessionStorage.setItem(storageKey, uint8ToHex(sig))

                const sigHex = uint8ToHex(sig)
                const resp = await fetch('/api/wallet/derived-address', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userPublicKey: publicKey.toBase58(),
                        signature: sigHex,
                    }),
                })
                const data = await resp.json()
                if (!resp.ok || !data.success) {
                    throw new Error(data.message || 'Failed to derive address')
                }
                setDerivedAddress(data.derivedPublicKey)
                return { signature: sig, derivedAddress: data.derivedPublicKey as string }
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to obtain signature')
                setSignature(null)
                setDerivedAddress(null)
                return null
            } finally {
                setIsDeriving(false)
                inFlightRef.current = null
            }
        })()

        inFlightRef.current = promise
        return promise
    }, [connected, publicKey, signMessage, storageKey, clear])

    // Auto-restore from sessionStorage and derive address once per connection
    useEffect(() => {
        if (!connected || !publicKey) {
            clear()
            return
        }

        // Try sessionStorage cache first
        if (storageKey) {
            const cachedHex = sessionStorage.getItem(storageKey)
            if (cachedHex && !signature) {
                try {
                    const bytes = new Uint8Array(cachedHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
                    setSignature(bytes)
                } catch {
                    sessionStorage.removeItem(storageKey)
                }
            }
        }

        // If we still don't have signature, request it
        if (!signature && !inFlightRef.current) {
            void refreshSignature()
        } else if (!derivedAddress) {
            // If signature exists but derivedAddress not yet loaded, request derivation only
            const derive = async () => {
                try {
                    const sigHex = uint8ToHex(signature)
                    const resp = await fetch('/api/wallet/derived-address', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userPublicKey: publicKey!.toBase58(),
                            signature: sigHex,
                        }),
                    })
                    const data = await resp.json()
                    if (!resp.ok || !data.success) throw new Error('Failed to derive address')
                    setDerivedAddress(data.derivedPublicKey)
                } catch {
                    // fall back to fresh flow
                    void refreshSignature()
                }
            }
            void derive()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connected, publicKey])

    const value: SignatureContextType = {
        signature,
        derivedAddress,
        isDeriving,
        error,
        refreshSignature,
        clear,
    }

    return (
        <SignatureContext.Provider value={value}>
            {children}
        </SignatureContext.Provider>
    )
}

export function useSignature() {
    const ctx = useContext(SignatureContext)
    if (!ctx) throw new Error('useSignature must be used within SignatureProvider')
    return ctx
}


