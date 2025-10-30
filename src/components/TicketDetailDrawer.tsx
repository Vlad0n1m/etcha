"use client"

import { useState } from "react"
import { X, Loader2, AlertCircle } from "lucide-react"
import { Drawer } from "vaul"
import { DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useWallet } from "@solana/wallet-adapter-react"

interface TicketDetailDrawerProps {
    open: boolean
    onClose: () => void
    ticketId: string
    originalPrice: number
    eventTitle: string
    walletAddress: string | null
    onSuccess: () => void
}

export default function TicketDetailDrawer({
    open,
    onClose,
    ticketId,
    originalPrice,
    eventTitle,
    walletAddress,
    onSuccess,
}: TicketDetailDrawerProps) {
    const { signMessage } = useWallet()
    const [price, setPrice] = useState<string>("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!walletAddress) {
            setError("Please connect your wallet first")
            return
        }

        if (!signMessage) {
            setError("Your wallet does not support message signing. Please use a different wallet.")
            return
        }

        const priceValue = parseFloat(price)
        if (isNaN(priceValue) || priceValue <= 0) {
            setError("Please enter a valid price")
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            // Get seller signature for future NFT transfers
            // This allows instant purchase without seller being online
            // Use standardized message to ensure signature-derived keypair matches internalWalletAddress
            // IMPORTANT: Must use same message as profile page ("etcha-mint-auth-v1") to get same internal wallet
            const message = new TextEncoder().encode("etcha-mint-auth-v1")
            const signature = await signMessage(message)
            const signatureHex = Array.from(signature)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')

            const response = await fetch(`/api/profile/tickets/${ticketId}/resale`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    price: priceValue,
                    walletAddress: walletAddress,
                    signature: signatureHex,
                }),
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to list ticket for resale")
            }

            // Success - close drawer and refresh data
            onSuccess()
            onClose()
            setPrice("")
        } catch (err: any) {
            console.error("Error listing ticket:", err)
            setError(err.message || "Failed to list ticket for resale. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        if (!isSubmitting) {
            setPrice("")
            setError(null)
            onClose()
        }
    }

    const priceChange = price ? ((parseFloat(price) - originalPrice) / originalPrice * 100) : 0
    const isPositive = priceChange > 0
    const isNegative = priceChange < 0

    return (
        <Drawer.Root open={open} onOpenChange={(open) => !open && handleClose()}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-white z-50 bg-surface rounded-t-2xl">
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 mt-4" />

                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-2rem)]">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <DrawerTitle className="text-xl font-bold text-foreground">List Ticket for Resale</DrawerTitle>
                                <p className="text-sm text-muted-foreground mt-1">{eventTitle}</p>
                            </div>
                            <button
                                onClick={handleClose}
                                disabled={isSubmitting}
                                className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm text-red-800 font-medium">Error</p>
                                    <p className="text-sm text-red-700 mt-1">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Price Information */}
                        <div className="bg-muted/50 rounded-xl p-4 mb-4">
                            <h3 className="text-sm font-semibold text-foreground mb-3">Price Information</h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Original Price</span>
                                    <span className="font-semibold text-foreground">{originalPrice.toFixed(4)} SOL</span>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="resale-price" className="block text-sm font-medium text-foreground mb-2">
                                    Resale Price (SOL)
                                </label>
                                <Input
                                    id="resale-price"
                                    type="number"
                                    step="0.0001"
                                    min="0.0001"
                                    value={price}
                                    onChange={(e) => {
                                        setPrice(e.target.value)
                                        setError(null)
                                    }}
                                    placeholder="0.0000"
                                    required
                                    disabled={isSubmitting}
                                    className="w-full"
                                />
                                {price && !isNaN(parseFloat(price)) && (
                                    <div className="mt-2 text-xs">
                                        {isNegative && (
                                            <span className="text-green-600 font-medium">
                                                ↓ {Math.abs(priceChange).toFixed(1)}% cheaper than original
                                            </span>
                                        )}
                                        {isPositive && (
                                            <span className="text-red-600 font-medium">
                                                ↑ {priceChange.toFixed(1)}% more expensive than original
                                            </span>
                                        )}
                                        {priceChange === 0 && (
                                            <span className="text-gray-600 font-medium">
                                                Same as original price
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Disclaimer */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-xs text-blue-800">
                                    By listing this ticket, it will become available for purchase on the resale marketplace. 
                                    You can cancel the listing anytime before someone buys it.
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3 pt-4">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || !price || !walletAddress}
                                    className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:bg-primary/90 transition-all"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Listing...
                                        </>
                                    ) : (
                                        "List for Resale"
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={isSubmitting}
                                    variant="outline"
                                    className="w-full bg-muted text-foreground font-medium py-3.5 rounded-xl hover:bg-muted/80 transition-all"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}
