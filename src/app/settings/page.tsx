"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import MobileHeader from "@/components/MobileHeader"
import {
    User,
    Wallet,
    Building2,
    Calendar,
    Ticket,
    ChevronRight,
    LogOut,
    Shield,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    AlertCircle,
    Settings,
    Copy,
} from "lucide-react"
import bs58 from "bs58"

export default function SettingsPage() {
    const { data: session, status, update } = useSession()
    const { connected, publicKey, signMessage, disconnect } = useWallet()
    const { setVisible } = useWalletModal()
    const router = useRouter()
    const searchParams = useSearchParams()

    const [isLinking, setIsLinking] = useState(false)
    const [linkError, setLinkError] = useState("")
    const [linkSuccess, setLinkSuccess] = useState(false)
    const [copied, setCopied] = useState(false)

    // Get initial tab from URL or default to profile
    const tabParam = searchParams.get("tab")
    const [activeTab, setActiveTab] = useState<"profile" | "wallet">(
        tabParam === "wallet" ? "wallet" : "profile"
    )

    // Check if wallet already linked
    useEffect(() => {
        if (session?.user?.walletAddress) {
            setLinkSuccess(true)
        }
    }, [session])

    // Role badge colors
    const roleBadge: Record<string, { color: string; label: string }> = {
        USER: { color: "bg-gray-100 text-gray-700", label: "User" },
        ORGANIZER: { color: "bg-purple-100 text-purple-700", label: "Organizer" },
        ADMIN: { color: "bg-red-100 text-red-700", label: "Admin" },
    }

    // Organizer status badges
    const statusBadge: Record<string, { color: string; label: string }> = {
        PENDING: { color: "bg-yellow-100 text-yellow-700", label: "Pending Approval" },
        APPROVED: { color: "bg-green-100 text-green-700", label: "Approved" },
        REJECTED: { color: "bg-red-100 text-red-700", label: "Rejected" },
    }

    const handleConnectWallet = () => {
        setVisible(true)
    }

    const handleLinkWallet = async () => {
        if (!publicKey || !signMessage || !session?.user?.id) return

        setIsLinking(true)
        setLinkError("")

        try {
            const message = `Link wallet to Etcha account\n\nAccount: ${session.user.id}\nWallet: ${publicKey.toBase58()}\nTimestamp: ${Date.now()}`
            const messageBytes = new TextEncoder().encode(message)
            const signature = await signMessage(messageBytes)
            const signatureBase58 = bs58.encode(signature)

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

            await update({ walletAddress: publicKey.toBase58() })
            setLinkSuccess(true)
        } catch (err: any) {
            console.error("Link wallet error:", err)
            setLinkError(err.message || "Failed to link wallet. Please try again.")
        } finally {
            setIsLinking(false)
        }
    }

    const handleDisconnect = () => {
        disconnect()
        setLinkSuccess(false)
        setLinkError("")
    }

    const handleCopyWallet = () => {
        if (session?.user?.walletAddress) {
            navigator.clipboard.writeText(session.user.walletAddress)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleSignOut = async () => {
        await signOut({ callbackUrl: "/" })
    }

    // Loading state
    if (status === "loading") {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Loading...</p>
                </div>
            </div>
        )
    }

    // Not authenticated - redirect to login
    if (!session?.user) {
        router.push("/auth/login")
        return null
    }

    const user = session.user

    return (
        <div className="min-h-screen bg-gray-50">
            <MobileHeader />

            <div className="pt-20 md:pt-8 pb-24 md:pb-8">
                <div className="max-w-2xl mx-auto px-4">
                    {/* Page Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Settings className="w-6 h-6 text-gray-700" />
                            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-2 text-gray-500 hover:text-red-600 text-sm transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign out
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
                        <button
                            onClick={() => setActiveTab("profile")}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === "profile"
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            <User className="w-4 h-4 inline-block mr-2" />
                            Profile
                        </button>
                        <button
                            onClick={() => setActiveTab("wallet")}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === "wallet"
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            <Wallet className="w-4 h-4 inline-block mr-2" />
                            Wallet
                        </button>
                    </div>

                    {/* Profile Tab */}
                    {activeTab === "profile" && (
                        <div className="space-y-4">
                            {/* Profile Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                                        {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-lg font-bold text-gray-900">{user.name || "User"}</h2>
                                        <p className="text-sm text-gray-500">{user.email}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${roleBadge[user.role || "USER"].color}`}>
                                                {roleBadge[user.role || "USER"].label}
                                            </span>
                                            {user.role === "ORGANIZER" && user.organizerStatus && (
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusBadge[user.organizerStatus].color}`}>
                                                    {statusBadge[user.organizerStatus].label}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 border-b border-gray-100">
                                    <h3 className="font-semibold text-gray-900">Quick Actions</h3>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    <Link
                                        href="/"
                                        className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                <Calendar className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">Browse Events</p>
                                                <p className="text-xs text-gray-500">Find and buy tickets</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    </Link>

                                    <Link
                                        href="/profile"
                                        className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                                <Ticket className="w-5 h-5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">My Tickets</p>
                                                <p className="text-xs text-gray-500">View your purchased tickets</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    </Link>

                                    {user.role === "USER" && (
                                        <Link
                                            href="/settings/organizer-request"
                                            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                    <Building2 className="w-5 h-5 text-purple-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">Become an Organizer</p>
                                                    <p className="text-xs text-gray-500">Create and manage events</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                        </Link>
                                    )}

                                    {user.role === "ORGANIZER" && user.organizerStatus === "APPROVED" && (
                                        <Link
                                            href="/organizer/create-event"
                                            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                    <Calendar className="w-5 h-5 text-purple-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">Create Event</p>
                                                    <p className="text-xs text-gray-500">Set up a new event</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                        </Link>
                                    )}

                                    {user.role === "ADMIN" && (
                                        <Link
                                            href="/admin"
                                            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                                    <Shield className="w-5 h-5 text-red-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">Admin Panel</p>
                                                    <p className="text-xs text-gray-500">Manage platform</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Wallet Tab */}
                    {activeTab === "wallet" && (
                        <div className="space-y-4">
                            {/* Wallet Status Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Wallet className="w-6 h-6 text-gray-700" />
                                    <h3 className="font-semibold text-gray-900">Solana Wallet</h3>
                                </div>

                                {/* Already linked wallet */}
                                {session?.user?.walletAddress ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                            <span className="text-sm font-medium text-green-700">Wallet linked successfully</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Linked Wallet Address</p>
                                                <p className="font-mono text-sm">
                                                    {session.user.walletAddress.slice(0, 8)}...
                                                    {session.user.walletAddress.slice(-8)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleCopyWallet}
                                                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                                title={copied ? "Copied!" : "Copy address"}
                                            >
                                                <Copy className={`w-4 h-4 ${copied ? "text-green-500" : "text-gray-500"}`} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Link wallet flow */
                                    <div className="space-y-4">
                                        {linkError && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                                <p className="text-sm text-red-600">{linkError}</p>
                                            </div>
                                        )}

                                        {/* Step 1: Connect */}
                                        <div className={`p-4 rounded-xl border ${connected ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${connected ? "bg-green-500 text-white" : "bg-purple-600 text-white"}`}>
                                                    {connected ? <CheckCircle className="w-5 h-5" /> : "1"}
                                                </div>
                                                <h4 className="font-medium text-gray-900">Connect Wallet</h4>
                                            </div>

                                            {!connected ? (
                                                <button
                                                    onClick={handleConnectWallet}
                                                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
                                                >
                                                    Connect Solana Wallet
                                                </button>
                                            ) : (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
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
                                        <div className={`p-4 rounded-xl border ${!connected ? "opacity-50 bg-gray-50 border-gray-200" : "bg-gray-50 border-gray-200"}`}>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${!connected ? "bg-gray-300 text-gray-500" : "bg-purple-600 text-white"}`}>
                                                    2
                                                </div>
                                                <h4 className="font-medium text-gray-900">Sign & Link</h4>
                                            </div>

                                            <p className="text-sm text-gray-500 mb-3">
                                                Sign a message to verify ownership and link this wallet to your account.
                                            </p>

                                            <button
                                                onClick={handleLinkWallet}
                                                disabled={!connected || isLinking}
                                                className="w-full bg-gray-900 text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                                        <div className="p-4 bg-blue-50 rounded-xl">
                                            <p className="text-xs text-blue-700">
                                                <strong>Note:</strong> Signing a message is free and does not require any transaction fees.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Why link wallet */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="font-semibold text-gray-900 mb-4">Why link your wallet?</h3>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3">
                                        <Ticket className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-gray-900">Buy NFT Tickets</p>
                                            <p className="text-sm text-gray-500">Purchase tickets directly to your wallet</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <Building2 className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-gray-900">Resell Tickets</p>
                                            <p className="text-sm text-gray-500">List your tickets on the marketplace</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <Shield className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-gray-900">Verify Ownership</p>
                                            <p className="text-sm text-gray-500">Prove you own your tickets on-chain</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
