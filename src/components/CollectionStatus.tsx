"use client"

import { useEffect, useState } from "react"
import { Users, Loader2 } from "lucide-react"

interface CollectionStatusProps {
    candyMachineAddress: string
    showDetails?: boolean
}

interface CandyMachineData {
    itemsAvailable: number
    itemsRedeemed: number
    itemsRemaining: number
    price: number
    collectionAddress: string
}

export default function CollectionStatus({
    candyMachineAddress,
    showDetails = false,
}: CollectionStatusProps) {
    const [data, setData] = useState<CandyMachineData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchCandyMachineData()
    }, [candyMachineAddress])

    const fetchCandyMachineData = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/candy-machine/${candyMachineAddress}`)
            const result = await response.json()

            if (result.success) {
                setData(result)
                setError(null)
            } else {
                setError(result.message || "Failed to fetch collection data")
            }
        } catch (err) {
            console.error("Error fetching Candy Machine data:", err)
            setError("Failed to fetch collection data")
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-4 bg-muted/50 rounded-xl">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading collection data...</span>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="p-4 bg-destructive/10 rounded-xl border border-destructive/20">
                <p className="text-sm text-destructive">{error || "No data available"}</p>
            </div>
        )
    }

    const progress = (data.itemsRedeemed / data.itemsAvailable) * 100
    const isSoldOut = data.itemsRemaining === 0

    const getStatusBadge = () => {
        if (isSoldOut) {
            return (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                    Sold Out
                </span>
            )
        }
        return (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                Active
            </span>
        )
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Collection Status</h3>
                {getStatusBadge()}
            </div>

            {/* Progress bar */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>
                            {data.itemsRedeemed} / {data.itemsAvailable} sold
                        </span>
                    </div>
                    <span className="text-xs font-medium text-foreground">{progress.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Price */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">Price per ticket</span>
                <span className="text-sm font-bold text-foreground">{data.price} SOL</span>
            </div>

            {/* Details (if enabled) */}
            {showDetails && (
                <div className="pt-2 border-t border-border space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Remaining</span>
                        <span className="font-medium text-foreground">{data.itemsRemaining}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Collection Address</span>
                        <span className="font-mono text-foreground">
                            {data.collectionAddress.slice(0, 4)}...{data.collectionAddress.slice(-4)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}

