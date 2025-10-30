"use client"

import { useState, useEffect, use } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, Calendar, MapPin, Clock, Copy, ExternalLink, CheckCircle2, AlertCircle, Loader2, Tag } from "lucide-react"
import MobileHeader from "@/components/MobileHeader"
import TicketDetailDrawer from "@/components/TicketDetailDrawer"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface TicketDetail {
    id: string
    nftMintAddress: string
    tokenId: number
    metadataUri: string | null
    isValid: boolean
    isUsed: boolean
    status: "bought" | "on_resale" | "passed" | "nft"
    createdAt: string
    price: number
    originalPrice: number
    marketPrice: number
    event: {
        id: string
        title: string
        description: string
        imageUrl: string
        date: string
        time: string
        fullAddress: string
        category: string
        organizer: {
            name: string
            walletAddress: string
        } | null
    }
    order: {
        id: string
        totalPrice: number
        quantity: number
        status: string
        transactionHash: string | null
        createdAt: string
    }
    listing: {
        id: string
        price: number
        originalPrice: number
        listingAddress: string
        auctionHouseAddress: string
        status: string
        createdAt: string
    } | null
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params)
    const ticketId = resolvedParams.id
    const { connected, publicKey } = useWallet()
    const router = useRouter()

    const [ticket, setTicket] = useState<TicketDetail | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState<string | null>(null)
    const [showResaleDrawer, setShowResaleDrawer] = useState(false)

    useEffect(() => {
        const loadTicket = async () => {
            if (!connected || !publicKey) {
                setError("Please connect your wallet")
                setIsLoading(false)
                return
            }

            try {
                setIsLoading(true)
                setError(null)
                const response = await fetch(`/api/profile/tickets/${ticketId}?walletAddress=${publicKey.toString()}`)
                const data = await response.json()

                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Failed to load ticket details")
                }

                setTicket(data.ticket)
            } catch (err: any) {
                console.error("Error loading ticket:", err)
                setError(err.message || "Failed to load ticket details")
            } finally {
                setIsLoading(false)
            }
        }

        loadTicket()
    }, [ticketId, connected, publicKey])

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
        })
    }

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-6)}`
    }

    const handleCopy = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(label)
            setTimeout(() => setCopied(null), 2000)
        } catch (err) {
            console.error("Failed to copy:", err)
        }
    }

    const handleResaleSuccess = () => {
        // Reload ticket data to get updated status
        if (connected && publicKey) {
            fetch(`/api/profile/tickets/${ticketId}?walletAddress=${publicKey.toString()}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setTicket(data.ticket)
                    }
                })
                .catch(err => console.error("Error reloading ticket:", err))
        }
    }

    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet"

    if (!connected) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Connect Your Wallet</h2>
                    <p className="text-gray-600 mb-8">Connect your Solana wallet to view ticket details</p>
                </div>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error || !ticket) {
        return (
            <div className="min-h-screen bg-background">
                <MobileHeader />
                <div className="flex flex-col items-center justify-center min-h-screen p-4">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-foreground mb-2">Error Loading Ticket</h2>
                    <p className="text-muted-foreground text-center mb-6">{error || "Ticket not found"}</p>
                    <Button onClick={() => router.push("/profile")} variant="outline">
                        Back to Profile
                    </Button>
                </div>
            </div>
        )
    }

    const eventDate = new Date(ticket.event.date)
    const now = new Date()
    const isPastEvent = eventDate < now
    const canListForResale = !ticket.listing && !isPastEvent && ticket.status !== "on_resale"

    return (
        <div className="min-h-screen bg-background pb-24">
            <MobileHeader />
            
            {/* Header */}
            <div className="bg-surface/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
                <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
                    <Link href="/profile" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                        <span className="font-medium text-sm">Back</span>
                    </Link>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {ticket.event.category}
                    </span>
                </div>
            </div>

            {/* Event Image */}
            <div className="relative h-56 w-full">
                <Image src={ticket.event.imageUrl || "/placeholder.svg"} alt={ticket.event.title} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            </div>

            <div className="px-4 max-w-2xl mx-auto">
                {/* Status Badge */}
                <div className="-mt-4 relative z-10">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        ticket.status === "on_resale" ? "bg-yellow-100 text-yellow-800" :
                        ticket.status === "passed" ? "bg-gray-100 text-gray-800" :
                        "bg-green-100 text-green-800"
                    }`}>
                        {ticket.status === "on_resale" && <Tag className="w-3 h-3 mr-1.5" />}
                        {ticket.status === "on_resale" && "On Resale"}
                        {ticket.status === "passed" && "Event Passed"}
                        {ticket.status === "bought" && "Owned"}
                        {ticket.status === "nft" && "NFT"}
                    </div>
                </div>

                {/* Event Information */}
                <div className="bg-surface rounded-2xl p-5 mt-4 border border-border shadow-lg">
                    <h1 className="text-xl font-bold text-foreground mb-2 leading-tight">{ticket.event.title}</h1>
                    {ticket.event.organizer && (
                        <div className="text-sm text-muted-foreground mb-4">
                            by {ticket.event.organizer.name}
                        </div>
                    )}

                    <p className="text-sm text-muted-foreground mb-4">{ticket.event.description}</p>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                        <div className="flex items-start gap-2">
                            <Calendar className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                                <div className="text-xs text-muted-foreground">Date</div>
                                <div className="text-sm font-medium text-foreground">{formatDate(ticket.event.date)}</div>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <Clock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                                <div className="text-xs text-muted-foreground">Time</div>
                                <div className="text-sm font-medium text-foreground">{ticket.event.time}</div>
                            </div>
                        </div>

                        <div className="flex items-start gap-2 col-span-2">
                            <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                                <div className="text-xs text-muted-foreground">Location</div>
                                <div className="text-sm font-medium text-foreground">{ticket.event.fullAddress}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ticket Information */}
                <div className="bg-surface rounded-2xl p-5 mt-4 border border-border">
                    <h2 className="text-base font-bold text-foreground mb-4">Ticket Details</h2>

                    <div className="space-y-4">
                        {/* Price Information */}
                        <div className="bg-muted/50 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Purchase Price</span>
                                <span className="text-sm font-semibold text-foreground">{ticket.price.toFixed(4)} SOL</span>
                            </div>
                            {ticket.listing && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Listed Price</span>
                                    <span className="text-sm font-semibold text-yellow-600">{ticket.listing.price.toFixed(4)} SOL</span>
                                </div>
                            )}
                        </div>

                        {/* NFT Information */}
                        <div>
                            <div className="text-xs text-muted-foreground mb-2">NFT Mint Address</div>
                            <div className="flex items-center justify-between bg-background rounded-lg p-3 border border-border">
                                <p className="text-sm font-mono text-foreground truncate flex-1">
                                    {formatAddress(ticket.nftMintAddress)}
                                </p>
                                <div className="flex items-center gap-2 ml-2">
                                    <button
                                        onClick={() => handleCopy(ticket.nftMintAddress, "nft")}
                                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                                    >
                                        {copied === "nft" ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </button>
                                    <a
                                        href={`https://explorer.solana.com/address/${ticket.nftMintAddress}?cluster=${network}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Transaction Information */}
                        {ticket.order.transactionHash && (
                            <div>
                                <div className="text-xs text-muted-foreground mb-2">Purchase Transaction</div>
                                <div className="flex items-center justify-between bg-background rounded-lg p-3 border border-border">
                                    <p className="text-sm font-mono text-foreground truncate flex-1">
                                        {formatAddress(ticket.order.transactionHash)}
                                    </p>
                                    <div className="flex items-center gap-2 ml-2">
                                        <button
                                            onClick={() => handleCopy(ticket.order.transactionHash!, "tx")}
                                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                                        >
                                            {copied === "tx" ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <Copy className="w-4 h-4 text-muted-foreground" />
                                            )}
                                        </button>
                                        <a
                                            href={`https://explorer.solana.com/tx/${ticket.order.transactionHash}?cluster=${network}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4 text-muted-foreground" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Ticket Status */}
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <div className="flex items-center gap-2">
                                {ticket.isValid && !ticket.isUsed && (
                                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                                        Valid
                                    </span>
                                )}
                                {ticket.isUsed && (
                                    <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                        Used
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-4 space-y-3">
                    {canListForResale && (
                        <Button
                            onClick={() => setShowResaleDrawer(true)}
                            className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:bg-primary/90 transition-all"
                        >
                            Put on Resale
                        </Button>
                    )}
                    {ticket.listing && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Tag className="w-4 h-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-800">Ticket Listed for Resale</span>
                            </div>
                            <p className="text-xs text-yellow-700">
                                This ticket is currently listed at {ticket.listing.price.toFixed(4)} SOL. 
                                It will be removed from resale when sold or cancelled.
                            </p>
                        </div>
                    )}
                    {isPastEvent && (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                            <p className="text-sm text-gray-600 text-center">
                                This event has passed. This ticket cannot be listed for resale.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Resale Drawer */}
            {connected && publicKey && (
                <TicketDetailDrawer
                    open={showResaleDrawer}
                    onClose={() => setShowResaleDrawer(false)}
                    ticketId={ticket.id}
                    originalPrice={ticket.originalPrice}
                    eventTitle={ticket.event.title}
                    walletAddress={publicKey.toString()}
                    onSuccess={handleResaleSuccess}
                />
            )}
        </div>
    )
}
