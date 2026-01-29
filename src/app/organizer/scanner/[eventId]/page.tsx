"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import QRScanner, { QRScanResult } from "@/components/QRScanner"
import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Loader2,
    Camera,
    CameraOff,
    Users,
    Ticket,
    RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface ScanResult {
    type: "success" | "error" | "warning"
    message: string
    ticket?: {
        id: string
        tokenId: number
        ownerName?: string
    }
    attendance?: {
        id: string
        scannedAt: string
        poapStatus: string
    }
}

interface ScanStats {
    ticketsSold: number
    totalScanned: number
    remainingToScan: number
    scanPercentage: number
    poap: {
        pending: number
        minted: number
        failed: number
    }
}

interface RecentScan {
    id: string
    scannedAt: string
    ticketNumber: number
    attendeeName: string
    poapStatus: string
}

export default function ScannerPage({ params }: { params: Promise<{ eventId: string }> }) {
    const resolvedParams = use(params)
    const { eventId } = resolvedParams
    const { data: session, status: sessionStatus } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const scannerCode = searchParams.get("code")

    const [isScanning, setIsScanning] = useState(false)
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
    const [authRole, setAuthRole] = useState<string | null>(null)
    const [eventTitle, setEventTitle] = useState<string>("")
    const [scanResult, setScanResult] = useState<ScanResult | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [stats, setStats] = useState<ScanStats | null>(null)
    const [recentScans, setRecentScans] = useState<RecentScan[]>([])
    const [showStats, setShowStats] = useState(false)

    // Authenticate scanner
    useEffect(() => {
        const authenticate = async () => {
            // Wait for session to load if not using scanner code
            if (!scannerCode && sessionStatus === "loading") return

            try {
                const response = await fetch("/api/scanner/auth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        eventId,
                        scannerCode: scannerCode || undefined,
                    }),
                })

                const data = await response.json()

                if (data.success) {
                    setIsAuthorized(true)
                    setAuthRole(data.role)
                    setEventTitle(data.event?.title || "")
                } else {
                    setIsAuthorized(false)
                }
            } catch (error) {
                console.error("Auth error:", error)
                setIsAuthorized(false)
            }
        }

        authenticate()
    }, [eventId, scannerCode, sessionStatus])

    // Fetch stats
    const fetchStats = useCallback(async () => {
        try {
            const url = new URL(`/api/scanner/stats/${eventId}`, window.location.origin)
            if (scannerCode) {
                url.searchParams.set("scannerCode", scannerCode)
            }

            const response = await fetch(url.toString())
            const data = await response.json()

            if (data.success) {
                setStats(data.stats)
                setRecentScans(data.recentScans || [])
            }
        } catch (error) {
            console.error("Stats error:", error)
        }
    }, [eventId, scannerCode])

    // Fetch stats on mount and periodically
    useEffect(() => {
        if (isAuthorized) {
            fetchStats()
            const interval = setInterval(fetchStats, 10000) // Every 10 seconds
            return () => clearInterval(interval)
        }
    }, [isAuthorized, fetchStats])

    // Handle QR scan
    const handleScan = async (result: QRScanResult) => {
        if (isProcessing) return

        setIsProcessing(true)
        setScanResult(null)

        try {
            const response = await fetch("/api/scanner/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ticketId: result.ticketId,
                    nftAddress: result.nftAddress,
                    eventId: result.eventId,
                    scannerCode: scannerCode || undefined,
                }),
            })

            const data = await response.json()

            if (data.success) {
                setScanResult({
                    type: "success",
                    message: "Ticket scanned successfully!",
                    ticket: data.ticket,
                    attendance: data.attendance,
                })
                // Play success sound
                playSound("success")
                // Refresh stats
                fetchStats()
            } else if (data.alreadyUsed) {
                setScanResult({
                    type: "warning",
                    message: "Ticket already used",
                    attendance: data.attendance,
                })
                playSound("warning")
            } else {
                setScanResult({
                    type: "error",
                    message: data.message || "Scan failed",
                })
                playSound("error")
            }
        } catch (error) {
            console.error("Scan error:", error)
            setScanResult({
                type: "error",
                message: "Network error. Please try again.",
            })
            playSound("error")
        } finally {
            setIsProcessing(false)

            // Clear result after 3 seconds
            setTimeout(() => {
                setScanResult(null)
            }, 3000)
        }
    }

    const handleScanError = (error: string) => {
        console.warn("Scanner error:", error)
    }

    // Play feedback sounds
    const playSound = (type: "success" | "warning" | "error") => {
        try {
            const frequencies = {
                success: [523, 659, 784], // C5, E5, G5 (happy chord)
                warning: [440, 349], // A4, F4
                error: [200, 150], // Low tones
            }

            const audioContext = new (window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
            const freqs = frequencies[type]

            freqs.forEach((freq, i) => {
                const oscillator = audioContext.createOscillator()
                const gainNode = audioContext.createGain()

                oscillator.connect(gainNode)
                gainNode.connect(audioContext.destination)

                oscillator.frequency.value = freq
                oscillator.type = "sine"

                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
                gainNode.gain.exponentialRampToValueAtTime(
                    0.001,
                    audioContext.currentTime + 0.3
                )

                oscillator.start(audioContext.currentTime + i * 0.1)
                oscillator.stop(audioContext.currentTime + 0.3 + i * 0.1)
            })
        } catch {
            // Audio not supported
        }
    }

    // Loading state
    if (isAuthorized === null) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    // Unauthorized
    if (isAuthorized === false) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-3">Access Denied</h2>
                    <p className="text-muted-foreground mb-6">
                        You don&apos;t have permission to scan tickets for this event.
                        {!session && " Please sign in or use a valid scanner code."}
                    </p>
                    {!session ? (
                        <Button onClick={() => router.push("/auth/signin")}>
                            Sign In
                        </Button>
                    ) : (
                        <Button onClick={() => router.push("/dashboard")}>
                            Go to Dashboard
                        </Button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background pb-safe">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-background border-b border-border">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-bold text-foreground truncate">
                                {eventTitle || "Ticket Scanner"}
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                {authRole === "admin"
                                    ? "Admin"
                                    : authRole === "organizer"
                                        ? "Organizer"
                                        : "Staff"}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowStats(!showStats)}
                        >
                            <Users className="w-4 h-4 mr-1" />
                            Stats
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Panel */}
            {showStats && stats && (
                <div className="bg-surface border-b border-border p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-foreground">Scanning Progress</h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchStats}
                            className="h-8 px-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">
                                {stats.totalScanned} / {stats.ticketsSold} scanned
                            </span>
                            <span className="font-medium text-foreground">
                                {stats.scanPercentage}%
                            </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${stats.scanPercentage}%` }}
                            />
                        </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-green-600">
                                {stats.totalScanned}
                            </p>
                            <p className="text-xs text-green-700">Scanned</p>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-yellow-600">
                                {stats.remainingToScan}
                            </p>
                            <p className="text-xs text-yellow-700">Remaining</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-purple-600">
                                {stats.poap.minted}
                            </p>
                            <p className="text-xs text-purple-700">POAPs</p>
                        </div>
                    </div>

                    {/* Recent scans */}
                    {recentScans.length > 0 && (
                        <div className="mt-4">
                            <h4 className="text-sm font-medium text-foreground mb-2">
                                Recent Scans
                            </h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                {recentScans.slice(0, 5).map((scan) => (
                                    <div
                                        key={scan.id}
                                        className="flex items-center justify-between text-sm bg-background rounded-lg px-3 py-2"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Ticket className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-foreground">
                                                #{scan.ticketNumber}
                                            </span>
                                            <span className="text-muted-foreground">
                                                {scan.attendeeName}
                                            </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(scan.scannedAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Scanner Area */}
            <div className="p-4">
                {/* Scan Result Overlay */}
                {scanResult && (
                    <div
                        className={`mb-4 p-4 rounded-xl border ${scanResult.type === "success"
                            ? "bg-green-50 border-green-200"
                            : scanResult.type === "warning"
                                ? "bg-yellow-50 border-yellow-200"
                                : "bg-red-50 border-red-200"
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            {scanResult.type === "success" ? (
                                <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                            ) : scanResult.type === "warning" ? (
                                <AlertTriangle className="w-6 h-6 text-yellow-500 shrink-0" />
                            ) : (
                                <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                            )}
                            <div>
                                <p
                                    className={`font-semibold ${scanResult.type === "success"
                                        ? "text-green-800"
                                        : scanResult.type === "warning"
                                            ? "text-yellow-800"
                                            : "text-red-800"
                                        }`}
                                >
                                    {scanResult.message}
                                </p>
                                {scanResult.ticket && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        Ticket #{scanResult.ticket.tokenId}
                                        {scanResult.ticket.ownerName &&
                                            ` • ${scanResult.ticket.ownerName}`}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* QR Scanner */}
                <div className="bg-surface rounded-2xl overflow-hidden border border-border">
                    {isScanning ? (
                        <div className="relative">
                            <QRScanner
                                isScanning={isScanning}
                                onScan={handleScan}
                                onError={handleScanError}
                                className="bg-black"
                            />

                            {/* Processing overlay */}
                            {isProcessing && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <div className="bg-white rounded-xl p-4 flex items-center gap-3">
                                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                        <span className="text-sm font-medium">Processing...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="aspect-square max-w-sm mx-auto flex flex-col items-center justify-center p-8">
                            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                                <CameraOff className="w-10 h-10 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground text-center mb-4">
                                Camera is paused
                            </p>
                            <p className="text-xs text-muted-foreground text-center">
                                Tap &quot;Start Scanning&quot; to begin
                            </p>
                        </div>
                    )}
                </div>

                {/* Control Buttons */}
                <div className="mt-4">
                    <Button
                        onClick={() => setIsScanning(!isScanning)}
                        className="w-full py-6 text-lg"
                        variant={isScanning ? "outline" : "default"}
                    >
                        {isScanning ? (
                            <>
                                <CameraOff className="w-5 h-5 mr-2" />
                                Stop Scanning
                            </>
                        ) : (
                            <>
                                <Camera className="w-5 h-5 mr-2" />
                                Start Scanning
                            </>
                        )}
                    </Button>
                </div>

                {/* Instructions */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        Point camera at the QR code on the ticket
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Works with Apple Wallet passes and printed tickets
                    </p>
                </div>
            </div>
        </div>
    )
}
