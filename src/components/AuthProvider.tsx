"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { getOrRequestSignature, clearSignature, SIGN_MESSAGE_TEXT } from '@/lib/utils/signature-cache'

interface AuthContextType {
    token: string | null
    isLoading: boolean
    error: string | null
    refreshToken: () => Promise<void>
    clearAuth: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
    children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const { connected, publicKey, signMessage } = useWallet()
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const storageKey = React.useMemo(() => (publicKey ? `etcha:mint:signature:${publicKey.toBase58()}` : null), [publicKey])
    const hasRequestedRef = useRef(false)

    const refreshToken = async () => {
        if (!signMessage || !publicKey || !storageKey) {
            setToken(null)
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const signature = await getOrRequestSignature(storageKey, signMessage)
            
            if (!signature) {
                throw new Error('Failed to get signature')
            }

            // Get auth token using the signature
            const authResponse = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    signature: Buffer.from(signature).toString('base64'),
                    message: SIGN_MESSAGE_TEXT
                })
            })

            if (!authResponse.ok) {
                throw new Error('Authentication failed')
            }

            const { token: newToken } = await authResponse.json()
            setToken(newToken)
        } catch (err) {
            console.error('Error refreshing token:', err)
            setError(err instanceof Error ? err.message : 'Authentication failed')
            setToken(null)
        } finally {
            setIsLoading(false)
        }
    }

    const clearAuth = () => {
        setToken(null)
        setError(null)
        if (storageKey) {
            clearSignature(storageKey)
        }
    }

    // Auto-refresh token when wallet connects
    useEffect(() => {
        if (connected && publicKey && !token && !hasRequestedRef.current) {
            hasRequestedRef.current = true
            refreshToken()
        } else if (!connected) {
            hasRequestedRef.current = false
            clearAuth()
        }
    }, [connected, publicKey, token])

    const value: AuthContextType = {
        token,
        isLoading,
        error,
        refreshToken,
        clearAuth
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
