"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    ChevronLeft,
    Wallet,
    Loader2,
    CheckCircle,
    AlertCircle,
    ExternalLink,
} from "lucide-react"
import bs58 from "bs58"

export default function WalletLinkPage() {
    const { data: session, update } = useSession()
    const { connected, publicKey, signMessage, disconnect } = useWallet()
    const { setVisible } = useWalletModal()
    const router = useRouter()

    const [isLinking, setIsLinking] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)

    // If wallet already linked, show success
    useEffect(() => {
        if (session?.user?.walletAddress) {
            setSuccess(true)
        }
    }, [session])

    const handleConnectWallet = () => {
        setVisible(true)
    }

    const handleLinkWallet = async () => {
        if (!publicKey || !signMessage || !session?.user?.id) return

        setIsLinking(true)
        setError("")

        try {
            // Create message to sign
            const message = `Link wallet to Etcha account\n\nAccount: ${session.user.id}\nWallet: ${publicKey.toBase58()}\nTimestamp: ${Date.now()}`
            const messageBytes = new TextEncoder().encode(message)

            // Request signature
            const signature = await signMessage(messageBytes)
            const signatureBase58 = bs58.encode(signature)

            // Send to API
            const response = await fetch("/api/wallet/link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    walletAddress: publicKey.toBase58(),
                    signature: signatureBase58,
                    message,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Failed to link wallet")
            }

            // Update session
            await update({ walletAddress: publicKey.toBase58() })

            setSuccess(true)

            // Redirect after success
            setTimeout(() => {
                router.push("/dashboard")
            }, 2000)
        } catch (err: any) {
            console.error("Link wallet error:", err)
            setError(err.message || "Failed to link wallet. Please try again.")
        } finally {
            setIsLinking(false)
        }
    }

    const handleDisconnect = () => {
        disconnect()
        setSuccess(false)
        setError("")
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-md mx-auto px-4 py-4 flex items-center">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span className="text-sm font-medium">Dashboard</span>
                    </Link>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-md mx-auto px-4 py-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Wallet className="w-8 h-8 text-purple-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Link Your Wallet</h1>
                    <p className="text-gray-500 mt-2">
                        Connect your Solana wallet to buy and manage NFT tickets
                    </p>
                </div>

                {/* Success State */}
                {success && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Wallet Linked!</h2>
                        <p className="text-gray-500 text-sm mb-4">
                            Your wallet has been successfully linked to your account.
                        </p>
                        {session?.user?.walletAddress && (
                            <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                <p className="text-xs text-gray-500 mb-1">Connected Wallet</p>
                                <p className="font-mono text-sm">
                                    {session.user.walletAddress.slice(0, 8)}...
                                    {session.user.walletAddress.slice(-8)}
                                </p>
                            </div>
                        )}
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
                        >
                            Back to Dashboard
                            <ExternalLink className="w-4 h-4" />
                        </Link>
                    </div>
                )}

                {/* Connect/Link Flow */}
                {!success && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        {/* Step 1: Connect Wallet */}
                        <div className={`mb-6 ${connected ? "opacity-50" : ""}`}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${connected ? "bg-green-100 text-green-600" : "bg-primary text-white"}`}>
                                    {connected ? <CheckCircle className="w-5 h-5" /> : "1"}
                                </div>
                                <h3 className="font-semibold text-gray-900">Connect Wallet</h3>
                            </div>

                            {!connected ? (
                                <button
                                    onClick={handleConnectWallet}
                                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
                                >
                                    Connect Solana Wallet
                                </button>
                            ) : (
                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        <span className="text-sm font-medium text-green-700">
                                            {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleDisconnect}
                                        className="text-xs text-gray-500 hover:text-gray-700"
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Step 2: Sign & Link */}
                        <div className={!connected ? "opacity-50" : ""}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${!connected ? "bg-gray-200 text-gray-500" : "bg-primary text-white"}`}>
                                    2
                                </div>
                                <h3 className="font-semibold text-gray-900">Sign & Link</h3>
                            </div>

                            <p className="text-sm text-gray-500 mb-4">
                                Sign a message to verify ownership and link this wallet to your account.
                            </p>

                            <button
                                onClick={handleLinkWallet}
                                disabled={!connected || isLinking}
                                className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLinking ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Signing...
                                    </>
                                ) : (
                                    "Sign & Link Wallet"
                                )}
                            </button>
                        </div>

                        {/* Info */}
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                            <p className="text-xs text-blue-700">
                                <strong>Note:</strong> Signing a message is free and does not require any transaction fees.
                                Your wallet will not be charged.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
