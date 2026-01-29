"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    ArrowLeft,
    TreeDeciduous,
    Ticket,
    Award,
    Loader2,
    AlertTriangle,
    CheckCircle,
    RefreshCw,
    Plus,
    ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface TreeData {
    id: string
    address: string
    type: string
    maxDepth: number
    capacity: number
    minted: number
    available: number
    usagePercent: number
    isActive: boolean
    collectionAddress: string | null
    createdAt: string
}

interface TreeStats {
    ticket: { total: number; used: number; available: number; trees: number }
    poap: { total: number; used: number; available: number; trees: number }
}

export default function PlatformTreesPage() {
    const { data: session, status } = useSession()
    const router = useRouter()

    const [trees, setTrees] = useState<TreeData[]>([])
    const [stats, setStats] = useState<TreeStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isInitializing, setIsInitializing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (status === "loading") return

        if (!session?.user || session.user.role !== "ADMIN") {
            router.push("/dashboard")
            return
        }

        fetchTrees()
    }, [session, status, router])

    const fetchTrees = async () => {
        try {
            setIsLoading(true)
            setError(null)

            const response = await fetch("/api/admin/platform-trees")
            const data = await response.json()

            if (data.success) {
                setTrees(data.trees)
                setStats(data.stats)
            } else {
                setError(data.message || "Failed to load trees")
            }
        } catch (err) {
            console.error("Error fetching trees:", err)
            setError("Failed to load trees")
        } finally {
            setIsLoading(false)
        }
    }

    const initializeTrees = async () => {
        try {
            setIsInitializing(true)
            setError(null)

            const response = await fetch("/api/admin/platform-trees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "initialize" }),
            })

            const data = await response.json()

            if (data.success) {
                await fetchTrees()
            } else {
                setError(data.message || "Failed to initialize trees")
            }
        } catch (err) {
            console.error("Error initializing trees:", err)
            setError("Failed to initialize trees")
        } finally {
            setIsInitializing(false)
        }
    }

    const getStatusColor = (usagePercent: number) => {
        if (usagePercent >= 90) return "text-red-600 bg-red-100"
        if (usagePercent >= 70) return "text-orange-600 bg-orange-100"
        return "text-green-600 bg-green-100"
    }

    const getProgressColor = (usagePercent: number) => {
        if (usagePercent >= 90) return "bg-red-500"
        if (usagePercent >= 70) return "bg-orange-500"
        return "bg-green-500"
    }

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat().format(num)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    if (status === "loading" || isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    const ticketTrees = trees.filter(t => t.type === "ticket")
    const poapTrees = trees.filter(t => t.type === "poap")

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-background border-b border-border">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin"
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex-1">
                            <h1 className="text-lg font-bold text-foreground">
                                Platform Merkle Trees
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Monitor and manage blockchain infrastructure
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchTrees}
                            className="shrink-0"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-red-800">Error</p>
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    </div>
                )}

                {/* Not initialized */}
                {trees.length === 0 && !isLoading && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
                        <TreeDeciduous className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                        <h2 className="text-lg font-bold text-yellow-800 mb-2">
                            Platform Trees Not Initialized
                        </h2>
                        <p className="text-sm text-yellow-700 mb-4">
                            Merkle trees are required for minting tickets and POAP badges.
                            Click below to create the initial trees (~0.5 SOL each).
                        </p>
                        <Button
                            onClick={initializeTrees}
                            disabled={isInitializing}
                            className="bg-yellow-600 hover:bg-yellow-700"
                        >
                            {isInitializing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Initializing...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Initialize Platform Trees
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {/* Overview Stats */}
                {stats && trees.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                        {/* Ticket Tree Stats */}
                        <div className="bg-surface rounded-2xl p-5 border border-border">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <Ticket className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Ticket Trees</h3>
                                    <p className="text-xs text-muted-foreground">
                                        {stats.ticket.trees} tree{stats.ticket.trees !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Used</span>
                                    <span className="font-medium">{formatNumber(stats.ticket.used)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Available</span>
                                    <span className="font-medium text-green-600">{formatNumber(stats.ticket.available)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total Capacity</span>
                                    <span className="font-medium">{formatNumber(stats.ticket.total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* POAP Tree Stats */}
                        <div className="bg-surface rounded-2xl p-5 border border-border">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                    <Award className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">POAP Trees</h3>
                                    <p className="text-xs text-muted-foreground">
                                        {stats.poap.trees} tree{stats.poap.trees !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Used</span>
                                    <span className="font-medium">{formatNumber(stats.poap.used)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Available</span>
                                    <span className="font-medium text-green-600">{formatNumber(stats.poap.available)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total Capacity</span>
                                    <span className="font-medium">{formatNumber(stats.poap.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Ticket Trees List */}
                {ticketTrees.length > 0 && (
                    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
                        <div className="p-4 border-b border-border">
                            <h2 className="font-semibold text-foreground flex items-center gap-2">
                                <Ticket className="w-4 h-4 text-blue-600" />
                                Ticket Merkle Trees
                            </h2>
                        </div>
                        <div className="divide-y divide-border">
                            {ticketTrees.map((tree) => (
                                <div key={tree.id} className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            {tree.isActive ? (
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full bg-gray-300" />
                                            )}
                                            <span className="font-mono text-sm text-muted-foreground">
                                                {tree.address.slice(0, 8)}...{tree.address.slice(-8)}
                                            </span>
                                            <a
                                                href={`https://explorer.solana.com/address/${tree.address}?cluster=devnet`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-700"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(tree.usagePercent)}`}>
                                            {tree.usagePercent}% used
                                        </span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                                        <div
                                            className={`h-full transition-all ${getProgressColor(tree.usagePercent)}`}
                                            style={{ width: `${tree.usagePercent}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{formatNumber(tree.minted)} minted</span>
                                        <span>{formatNumber(tree.available)} available</span>
                                        <span>Capacity: {formatNumber(tree.capacity)}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Created: {formatDate(tree.createdAt)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* POAP Trees List */}
                {poapTrees.length > 0 && (
                    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
                        <div className="p-4 border-b border-border">
                            <h2 className="font-semibold text-foreground flex items-center gap-2">
                                <Award className="w-4 h-4 text-purple-600" />
                                POAP Merkle Trees
                            </h2>
                        </div>
                        <div className="divide-y divide-border">
                            {poapTrees.map((tree) => (
                                <div key={tree.id} className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            {tree.isActive ? (
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full bg-gray-300" />
                                            )}
                                            <span className="font-mono text-sm text-muted-foreground">
                                                {tree.address.slice(0, 8)}...{tree.address.slice(-8)}
                                            </span>
                                            <a
                                                href={`https://explorer.solana.com/address/${tree.address}?cluster=devnet`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-purple-600 hover:text-purple-700"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(tree.usagePercent)}`}>
                                            {tree.usagePercent}% used
                                        </span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                                        <div
                                            className={`h-full transition-all ${getProgressColor(tree.usagePercent)}`}
                                            style={{ width: `${tree.usagePercent}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{formatNumber(tree.minted)} minted</span>
                                        <span>{formatNumber(tree.available)} available</span>
                                        <span>Capacity: {formatNumber(tree.capacity)}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Created: {formatDate(tree.createdAt)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm">
                    <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                        How it works
                    </h3>
                    <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                        <li>• Platform uses shared Merkle Trees for all events (cost-efficient)</li>
                        <li>• MEDIUM trees hold 131,072 NFTs each (~0.5 SOL)</li>
                        <li>• When a tree fills up, a new one is created automatically</li>
                        <li>• Yellow (70%+) = monitor closely, Red (90%+) = needs attention soon</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
