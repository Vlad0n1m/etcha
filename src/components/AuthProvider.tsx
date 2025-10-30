"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

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

    const refreshToken = async () => {
        if (!signMessage || !publicKey) {
            setToken(null)
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            // Create auth message and get signature (constant message, no timestamp)
            const message = 'etcha-auth-v1'
            const messageBytes = new TextEncoder().encode(message)
            const signature = await signMessage(messageBytes)

            // Get auth token
            const authResponse = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    signature: Buffer.from(signature).toString('base64'),
                    message
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
    }

    // Auto-refresh token when wallet connects
    useEffect(() => {
        if (connected && publicKey && !token) {
            refreshToken()
        } else if (!connected) {
            clearAuth()
        }
    }, [connected, publicKey])

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
