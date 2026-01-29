"use client"

import { useState, useEffect, use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    ArrowLeft,
    Ticket,
    Users,
    DollarSign,
    TrendingUp,
    QrCode,
    Award,
    Loader2,
    AlertCircle,
    RefreshCw,
    Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface EventStats {
    event: {
        id: string
        title: string
        date: string
        time: string
        price: number
        imageUrl: string
    }
    tickets: {
        available: number
        sold: number
        remaining: number
        soldPercentage: number
    }
    attendance: {
        total: number
        percentage: number
    }
    poap: {
        minted: number
        pending: number
        failed: number
    }
    revenue: {
        total: number
        organizerShare: number
        platformFee: number
    }
    recentScans: Array<{
        id: string
        scannedAt: string
        ticketNumber: number
        attendeeName: string
        poapStatus: string
    }>
}

export default function EventStatsPage({ params }: { params: Promise<{ eventId: string }> }) {
    const resolvedParams = use(params)
    const { eventId } = resolvedParams
    const { data: session, status } = useSession()
    const router = useRouter()

    const [stats, setStats] = useState<EventStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isRetryingPoap, setIsRetryingPoap] = useState(false)

    useEffect(() => {
        if (status === "loading") return

        if (!session?.user) {
            router.push("/auth/login")
            return
        }

        if (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN") {
            router.push("/dashboard")
            return
        }

        fetchStats()
    }, [session, status, router, eventId])

    const fetchStats = async () => {
        try {
            setIsLoading(true)
            setError(null)

            const response = await fetch(`/api/organizer/events/${eventId}/stats`)
            const data = await response.json()

            if (data.success) {
                setStats(data)
            } else {
                setError(data.message || "Failed to load stats")
            }
        } catch (err) {
            console.error("Error fetching stats:", err)
            setError("Failed to load stats")
        } finally {
            setIsLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
        })
    }

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    const retryPoapMinting = async () => {
        try {
            setIsRetryingPoap(true)
            const response = await fetch(`/api/organizer/events/${eventId}/poap`, {
                method: "PUT",
            })
            const data = await response.json()

            if (data.success) {
                alert(`Retrying POAP minting for ${data.retried} attendances`)
                // Refresh stats after a delay
                setTimeout(fetchStats, 2000)
            } else {
                alert(data.message || "Failed to retry POAP minting")
            }
        } catch (err) {
            console.error("Error retrying POAP:", err)
            alert("Failed to retry POAP minting")
        } finally {
            setIsRetryingPoap(false)
        }
    }

    if (status === "loading" || isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-foreground mb-2">Error</h2>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <div className="flex gap-2 justify-center">
                        <Button variant="outline" onClick={() => router.back()}>
                            Go Back
                        </Button>
                        <Button onClick={fetchStats}>Try Again</Button>
                    </div>
                </div>
            </div>
        )
    }

    if (!stats) return null

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-background border-b border-border">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg font-bold text-foreground truncate">
                                {stats.event.title}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {formatDate(stats.event.date)} at {stats.event.time}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchStats}
                            className="shrink-0"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
                {/* Quick Actions */}
                <div className="flex gap-2">
                    <Link href={`/organizer/scanner/${eventId}`} className="flex-1">
                        <Button className="w-full gap-2">
                            <QrCode className="w-4 h-4" />
                            Open Scanner
                        </Button>
                    </Link>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Tickets Sold */}
                    <div className="bg-surface rounded-2xl p-4 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Ticket className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="text-sm text-muted-foreground">Tickets Sold</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                            {stats.tickets.sold}
                            <span className="text-sm font-normal text-muted-foreground">
                                /{stats.tickets.available}
                            </span>
                        </p>
                        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 transition-all"
                                style={{ width: `${stats.tickets.soldPercentage}%` }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.tickets.soldPercentage}% sold
                        </p>
                    </div>

                    {/* Attendance */}
                    <div className="bg-surface rounded-2xl p-4 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <Users className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="text-sm text-muted-foreground">Attendance</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                            {stats.attendance.total}
                            <span className="text-sm font-normal text-muted-foreground">
                                /{stats.tickets.sold}
                            </span>
                        </p>
                        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 transition-all"
                                style={{ width: `${stats.attendance.percentage}%` }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.attendance.percentage}% checked in
                        </p>
                    </div>

                    {/* Revenue */}
                    <div className="bg-surface rounded-2xl p-4 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <DollarSign className="w-4 h-4 text-yellow-600" />
                            </div>
                            <span className="text-sm text-muted-foreground">Revenue</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                            {stats.revenue.organizerShare.toFixed(2)}
                            <span className="text-sm font-normal text-muted-foreground"> SOL</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Total: {stats.revenue.total.toFixed(2)} SOL
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Platform fee: {stats.revenue.platformFee.toFixed(4)} SOL
                        </p>
                    </div>

                    {/* POAP Badges */}
                    <div className="bg-surface rounded-2xl p-4 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Award className="w-4 h-4 text-purple-600" />
                            </div>
                            <span className="text-sm text-muted-foreground">POAP Badges</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                            {stats.poap.minted}
                        </p>
                        <div className="flex gap-2 mt-2 text-xs">
                            {stats.poap.pending > 0 && (
                                <span className="text-yellow-600">
                                    {stats.poap.pending} pending
                                </span>
                            )}
                            {stats.poap.failed > 0 && (
                                <span className="text-red-600">
                                    {stats.poap.failed} failed
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Retry POAP Minting */}
                {(stats.poap.pending > 0 || stats.poap.failed > 0) && (
                    <div className="bg-surface rounded-2xl p-4 border border-border">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-foreground">
                                    Pending POAP Mints
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {stats.poap.pending} pending, {stats.poap.failed} failed
                                </p>
                            </div>
                            <Button
                                onClick={retryPoapMinting}
                                disabled={isRetryingPoap}
                                variant="outline"
                                size="sm"
                            >
                                {isRetryingPoap ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Retrying...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Retry All
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Recent Scans */}
                <div className="bg-surface rounded-2xl border border-border overflow-hidden">
                    <div className="p-4 border-b border-border">
                        <h2 className="font-semibold text-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            Recent Check-ins
                        </h2>
                    </div>
                    {stats.recentScans.length > 0 ? (
                        <div className="divide-y divide-border">
                            {stats.recentScans.map((scan) => (
                                <div key={scan.id} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                            <Ticket className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">
                                                Ticket #{scan.ticketNumber}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {scan.attendeeName || "Anonymous"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">
                                            {formatTime(scan.scannedAt)}
                                        </p>
                                        {scan.poapStatus === "minted" && (
                                            <span className="text-xs text-purple-600">POAP sent</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No check-ins yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
