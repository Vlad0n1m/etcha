"use client"

import { useState, use, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, Calendar, MapPin, Clock, Loader2, Leaf, Users, Ticket, Share2, Heart, ExternalLink, Sparkles, UserPlus, UserCheck, ChevronDown, ChevronUp, AlertCircle } from "lucide-react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import WalletDrawer from "@/components/WalletDrawer"
import MintProgress, { MintStatus } from "@/components/MintProgress"
import MintResultModal from "@/components/MintResultModal"
import ResaleSection from "@/components/ResaleSection"
import { Button } from "@/components/ui/button"


interface TicketType {
    id: string
    name: string
    price: number
    quantity: number
    sold: number
    available: number
    description: string | null
    sortOrder: number
}

interface Event {
    id: string
    title: string
    price: number
    date: string
    time: string
    ticketsAvailable: number
    totalTicketsAvailable?: number
    ticketsSold?: number
    imageUrl: string
    description: string
    fullAddress: string
    locationMapUrl?: string | null
    maxTicketsPerUser?: number | null
    category?: string
    company?: string
    organizer: {
        id: string // User ID for follow functionality
        name: string
        avatar: string
        description: string
    }
    ticketTypes?: TicketType[]
    collectionNftAddress?: string
    // cNFT fields - now using shared platform tree
    merkleTreeAddress?: string // Legacy - kept for backwards compatibility
    merkleTreeDepth?: number
    nftType?: string // 'cnft' | 'legacy'
}

interface EventMintResult {
    success: boolean
    nftMintAddresses: string[]
    transactionSignature: string
    totalPaid: number
    message?: string
    organizerPayment: {
        amount: number
        transactionHash: string
    }
    platformFee: {
        amount: number
    }
    orderId: string
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const [event, setEvent] = useState<Event | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [ticketQuantity, setTicketQuantity] = useState(1)
    const [selectedTicketType, setSelectedTicketType] = useState<TicketType | null>(null)
    const [userTicketCount, setUserTicketCount] = useState(0)
    const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useState(false)
    const [isMinting, setIsMinting] = useState(false)
    const [mintStatus, setMintStatus] = useState<MintStatus>("preparing")
    const [mintProgress, setMintProgress] = useState<string>("")
    const [mintResult, setMintResult] = useState<EventMintResult | null>(null)
    const [showMintModal, setShowMintModal] = useState(false)
    const [showBuyConfirm, setShowBuyConfirm] = useState(false)
    const [isUpgrading, setIsUpgrading] = useState(false)
    const [isFollowing, setIsFollowing] = useState(false)
    const [isFollowLoading, setIsFollowLoading] = useState(false)
    const [followersCount, setFollowersCount] = useState(0)
    const [showFullDescription, setShowFullDescription] = useState(false)

    const { data: session } = useSession()
    const { connected, publicKey, sendTransaction, wallet } = useWallet()
    const { connection } = useConnection()
    const resolvedParams = use(params)

    const fetchEvent = useCallback(async () => {
        setIsLoading(true)
        setError('')

        try {
            const response = await fetch(`/api/events/${resolvedParams.id}`)

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to fetch event')
            }

            const responseData = await response.json()
            setEvent(responseData.event)
            setUserTicketCount(responseData.userTicketCount || 0)

            // Auto-select the first available ticket type
            if (responseData.event.ticketTypes && responseData.event.ticketTypes.length > 0) {
                const firstAvailable = responseData.event.ticketTypes.find((tt: TicketType) => tt.available > 0)
                setSelectedTicketType(firstAvailable || responseData.event.ticketTypes[0])
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch event')
        } finally {
            setIsLoading(false)
        }
    }, [resolvedParams.id])

    // Fetch event data on component mount
    useEffect(() => {
        if (resolvedParams.id) {
            fetchEvent()
        }
    }, [resolvedParams.id, fetchEvent])

    // Check if user is following the organizer
    const checkFollowStatus = useCallback(async () => {
        if (!event?.organizer?.id || !session?.user) return

        try {
            const response = await fetch(`/api/users/${event.organizer.id}`)
            if (response.ok) {
                const data = await response.json()
                setIsFollowing(data.isFollowing || false)
                setFollowersCount(data.followersCount || 0)
            }
        } catch (err) {
            console.error('Error checking follow status:', err)
        }
    }, [event?.organizer?.id, session?.user])

    useEffect(() => {
        checkFollowStatus()
    }, [checkFollowStatus])

    // Toggle follow organizer
    const handleFollowToggle = async () => {
        if (!event?.organizer?.id || !session?.user) return

        setIsFollowLoading(true)
        try {
            const response = await fetch(`/api/users/${event.organizer.id}/follow`, {
                method: 'POST',
            })

            if (response.ok) {
                const data = await response.json()
                setIsFollowing(data.isFollowing)
                setFollowersCount(data.followersCount)
            }
        } catch (err) {
            console.error('Error toggling follow:', err)
        } finally {
            setIsFollowLoading(false)
        }
    }

    const formatPrice = (price: number): string => {
        if (price >= 1000) {
            return `${(price / 1000).toFixed(1)}k`
        }
        return `${price}`
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            day: "numeric",
            month: "short"
        })
    }

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-6)}`
    }

    // Calculate max tickets user can buy
    const getMaxTicketsForUser = () => {
        if (!event) return 0

        const availableFromType = selectedTicketType?.available || 0

        if (event.maxTicketsPerUser) {
            const remainingLimit = event.maxTicketsPerUser - userTicketCount
            return Math.min(availableFromType, remainingLimit)
        }

        return availableFromType
    }

    const handleQuantityChange = (change: number) => {
        const maxAllowed = getMaxTicketsForUser()
        const newQuantity = ticketQuantity + change
        if (newQuantity >= 1 && newQuantity <= maxAllowed) {
            setTicketQuantity(newQuantity)
        }
    }

    const handleTicketTypeSelect = (ticketType: TicketType) => {
        setSelectedTicketType(ticketType)
        setTicketQuantity(1) // Reset quantity when changing type
    }

    const handleUpgradeEvent = async () => {
        if (!event) return

        setIsUpgrading(true)
        setError(null)

        try {
            const response = await fetch(`/api/events/${event.id}/upgrade-cnft`, {
                method: 'POST',
            })

            const result = await response.json()

            if (result.success) {
                // Refresh event data
                await fetchEvent()
                setError(null)
            } else {
                setError(result.error || 'Failed to upgrade event')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upgrade event')
        } finally {
            setIsUpgrading(false)
        }
    }

    const startMint = async () => {
        if (!connected || !publicKey || !wallet || !sendTransaction || !event) {
            setIsWalletDrawerOpen(true)
            return
        }

        if (!selectedTicketType) {
            setError("Please select a ticket type")
            return
        }

        // Check ticket limit
        if (event.maxTicketsPerUser) {
            const newTotal = userTicketCount + ticketQuantity
            if (newTotal > event.maxTicketsPerUser) {
                setError(`You can only purchase ${event.maxTicketsPerUser} tickets for this event. You already have ${userTicketCount}.`)
                return
            }
        }

        // Check if event supports cNFT (either has nftType='cnft' or legacy merkleTreeAddress)
        if (event.nftType !== 'cnft' && !event.merkleTreeAddress) {
            // This is a legacy event without cNFT infrastructure
            setError("This event was created before cNFT support. Please contact the organizer to upgrade the event.")
            return
        }

        setShowBuyConfirm(false)
        setIsMinting(true)
        setMintStatus("preparing")
        setMintProgress("Preparing ticket purchase...")

        try {
            // Step 1: Get Mint Transaction from Backend (uses shared platform tree)
            const mintResponse = await fetch('/api/mint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: event.id,
                    ticketTypeId: selectedTicketType.id,
                    buyerWallet: publicKey.toBase58(),
                    quantity: ticketQuantity,
                }),
            })

            const mintResult = await mintResponse.json()

            if (!mintResult.success) {
                throw new Error(mintResult.message || 'Failed to prepare mint transaction')
            }

            const transactionBase64 = mintResult.transaction
            const assetIds = mintResult.assetIds || []
            const mintMerkleTreeAddress = mintResult.merkleTreeAddress
            const mintPlatformTreeId = mintResult.platformTreeId

            if (!transactionBase64) {
                throw new Error('No transaction returned from server')
            }

            // Step 2: Deserialize and Sign Transaction
            setMintStatus("minting")
            setMintProgress("Please approve the transaction in your wallet...")

            const { Transaction } = await import('@solana/web3.js')
            const transaction = Transaction.from(Buffer.from(transactionBase64, 'base64'))

            // Sign and Send
            const signature = await sendTransaction(transaction, connection)

            setMintStatus("confirming")
            setMintProgress("Confirming on blockchain...")

            // Wait for confirmation
            await connection.confirmTransaction(signature, 'confirmed')

            // Step 3: Confirm Mint with Backend
            setMintProgress("Saving ticket information...")

            const response = await fetch("/api/mint/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    eventId: event.id,
                    ticketTypeId: selectedTicketType.id,
                    merkleTreeAddress: mintMerkleTreeAddress,
                    platformTreeId: mintPlatformTreeId,
                    buyerWallet: publicKey.toBase58(),
                    quantity: ticketQuantity,
                    assetIds: assetIds,
                    transactionSignature: signature,
                }),
            })

            const result = await response.json()

            if (result.success) {
                setMintStatus("complete")
                setMintProgress("Ticket purchased successfully!")
                setMintResult({
                    ...result,
                    nftMintAddresses: assetIds,
                    transactionSignature: signature,
                })
                setShowMintModal(true)
                // Update user ticket count
                setUserTicketCount(prev => prev + ticketQuantity)
            } else {
                setMintStatus("error")
                setMintProgress(result.message || "Failed to save ticket information")
                setTimeout(() => setIsMinting(false), 3000)
            }

        } catch (error: unknown) {
            console.error("Mint error:", error)
            setMintStatus("error")
            let errorMessage = "Failed to purchase ticket"

            if (error instanceof Error) {
                errorMessage = error.message
                if (errorMessage.includes('User rejected')) {
                    errorMessage = "Transaction cancelled by user"
                } else if (errorMessage.includes('insufficient funds')) {
                    errorMessage = "Insufficient SOL balance"
                }
            }

            setMintProgress(errorMessage)
            setTimeout(() => setIsMinting(false), 3000)
        }
    }

    const handleBuyClick = () => {
        if (!selectedTicketType) {
            setError("Please select a ticket type")
            return
        }
        setShowBuyConfirm(true)
    }


    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-primary/10 animate-pulse mx-auto mb-4" />
                        <Loader2 className="w-8 h-8 text-primary animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-muted-foreground font-medium">Loading event...</p>
                </div>
            </div>
        )
    }

    // Error or not found state
    if (error || !event) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
                <div className="text-center bg-surface rounded-3xl p-8 border border-border shadow-lg max-w-md">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                        <Ticket className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        {error || "Event Not Found"}
                    </h1>
                    <p className="text-muted-foreground mb-6">The event you're looking for doesn't exist or has been removed.</p>
                    <Link href="/" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-all">
                        <ChevronLeft className="w-4 h-4" />
                        Back to Events
                    </Link>
                </div>
            </div>
        )
    }

    const totalPrice = (selectedTicketType?.price || event.price) * ticketQuantity
    const hasTicketTypes = event.ticketTypes && event.ticketTypes.length > 0
    const maxAllowed = getMaxTicketsForUser()
    const isAtLimit = event.maxTicketsPerUser && userTicketCount >= event.maxTicketsPerUser
    const descriptionIsLong = event.description.length > 300

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-32" style={{ pointerEvents: 'auto' }}>
            {/* Hero Header with Glass Effect */}
            <div className="bg-surface/70 backdrop-blur-xl border-b border-border/30 sticky top-0 z-50 shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
                    <Link href="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-all hover:gap-3">
                        <ChevronLeft className="w-5 h-5" />
                        <span className="font-medium text-sm">Back</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        {/* Action buttons */}
                        <button className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
                            <Share2 className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors group">
                            <Heart className="w-4 h-4 text-muted-foreground group-hover:text-red-500" />
                        </button>
                        {/* Devnet badge */}
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-100 to-violet-100 text-purple-700 font-semibold uppercase tracking-wide border border-purple-200/50">Devnet</span>
                        {connected ? (
                            <WalletDrawer>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-2 border-green-400 text-green-700 hover:bg-green-50 rounded-xl"
                                >
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    {formatAddress(publicKey?.toString() || "")}
                                </Button>
                            </WalletDrawer>
                        ) : (
                            <WalletDrawer>
                                <Button
                                    size="sm"
                                    className="bg-gradient-to-r from-purple-500 to-violet-600 text-white hover:from-purple-600 hover:to-violet-700 rounded-xl shadow-lg shadow-purple-500/25"
                                >
                                    Connect Wallet
                                </Button>
                            </WalletDrawer>
                        )}
                    </div>
                </div>
            </div>

            {/* Hero Image Section */}
            <div className="relative h-72 w-full overflow-hidden">
                <Image
                    src={event.imageUrl || "/no-ticket-svgrepo-com.svg"}
                    alt={event.title ? `${event.title} event cover image` : "Event cover image"}
                    fill
                    className="object-cover scale-105 hover:scale-100 transition-transform duration-700"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

                {/* Floating badges */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/90 text-foreground backdrop-blur-md shadow-lg border border-white/50">
                        {event.category}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-500 to-green-500 text-white backdrop-blur-md shadow-lg">
                        <Leaf className="w-3.5 h-3.5" />
                        cNFT
                    </span>
                </div>

                {/* Tickets available badge */}
                <div className="absolute top-4 right-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-white/50">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-foreground">{event.ticketsAvailable} left</span>
                    </div>
                </div>
            </div>

            <div className="px-4 max-w-2xl mx-auto">
                {/* Main Info Card */}
                <div className="bg-surface rounded-3xl p-6 -mt-12 relative z-10 border border-border/50 shadow-xl">
                    {/* Title Section */}
                    <div className="mb-5">
                        <h1 className="text-2xl font-bold text-foreground mb-2 leading-tight">{event.title}</h1>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <Sparkles className="w-3 h-3 text-primary" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">{event.company}</span>
                        </div>
                    </div>

                    {/* Event Details Grid */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-2xl mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Calendar className="w-5 h-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Date</div>
                                <div className="text-sm font-semibold text-foreground">{formatDate(event.date)}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Clock className="w-5 h-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Time</div>
                                <div className="text-sm font-semibold text-foreground">{event.time}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 col-span-2">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-5 h-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Location</div>
                                <div className="text-sm font-semibold text-foreground">{event.fullAddress}</div>
                            </div>
                            {event.locationMapUrl && (
                                <a
                                    href={event.locationMapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80 transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Ticket Types Selection */}
                    {hasTicketTypes && (
                        <div className="mb-5">
                            <h3 className="text-sm font-semibold text-foreground mb-3">Select Ticket Type</h3>
                            <div className="space-y-2">
                                {event.ticketTypes!.map((ticketType) => {
                                    const isSoldOut = ticketType.available <= 0
                                    const isSelected = selectedTicketType?.id === ticketType.id

                                    return (
                                        <button
                                            key={ticketType.id}
                                            onClick={() => !isSoldOut && handleTicketTypeSelect(ticketType)}
                                            disabled={isSoldOut}
                                            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${isSelected
                                                ? 'border-primary bg-primary/5'
                                                : isSoldOut
                                                    ? 'border-border bg-muted/30 opacity-60 cursor-not-allowed'
                                                    : 'border-border hover:border-primary/50'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-base font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                                            {ticketType.name}
                                                        </span>
                                                        {isSoldOut && (
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                                                                SOLD OUT
                                                            </span>
                                                        )}
                                                    </div>
                                                    {ticketType.description && (
                                                        <p className="text-xs text-muted-foreground mt-1">{ticketType.description}</p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {ticketType.available}/{ticketType.quantity} available
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-lg font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                                        {formatPrice(ticketType.price)}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground ml-1">SOL</span>
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Legacy Price Section (for events without ticket types) */}
                    {!hasTicketTypes && event.price > 0 && (
                        <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-violet-500/5 rounded-2xl p-5 mb-5 border border-primary/10">
                            <div className="flex items-end justify-between">
                                <div>
                                    <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">Price per ticket</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">{formatPrice(event.price)}</span>
                                        <span className="text-lg font-semibold text-muted-foreground">SOL</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                    <Leaf className="w-4 h-4 text-emerald-600" />
                                    <span className="text-xs font-semibold text-emerald-700">Low fees</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Ticket Limit Warning */}
                    {event.maxTicketsPerUser && (
                        <div className={`p-3 rounded-xl mb-5 flex items-center gap-2 ${isAtLimit
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-blue-50 border border-blue-200'
                            }`}>
                            <AlertCircle className={`w-4 h-4 flex-shrink-0 ${isAtLimit ? 'text-red-500' : 'text-blue-500'}`} />
                            <span className={`text-sm ${isAtLimit ? 'text-red-700' : 'text-blue-700'}`}>
                                {isAtLimit
                                    ? `You have reached the limit of ${event.maxTicketsPerUser} tickets for this event.`
                                    : `Limit: ${event.maxTicketsPerUser} tickets per account. You have ${userTicketCount}.`
                                }
                            </span>
                        </div>
                    )}

                    {/* Quantity Selector */}
                    {(event.nftType === 'cnft' || event.merkleTreeAddress) && maxAllowed > 1 && !isAtLimit && (
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl mb-5">
                            <span className="text-sm font-medium text-foreground">Quantity</span>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleQuantityChange(-1)}
                                    disabled={ticketQuantity <= 1}
                                    className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    -
                                </button>
                                <span className="w-8 text-center font-bold text-foreground">{ticketQuantity}</span>
                                <button
                                    onClick={() => handleQuantityChange(1)}
                                    disabled={ticketQuantity >= maxAllowed}
                                    className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5 flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-xs">!</span>
                            </div>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Legacy Event Upgrade Banner - only for old events without cNFT */}
                    {event.nftType !== 'cnft' && !event.merkleTreeAddress && (
                        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200/50 rounded-2xl p-5 mb-5">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                                    <Sparkles className="w-5 h-5 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-amber-900">Upgrade Required</p>
                                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                        This event needs to be upgraded to enable ticket purchases with ultra-low fees.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleUpgradeEvent}
                                disabled={isUpgrading}
                                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold py-3 rounded-xl hover:from-amber-600 hover:to-yellow-600 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50"
                            >
                                {isUpgrading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Upgrading...
                                    </span>
                                ) : (
                                    'Upgrade Event to cNFT'
                                )}
                            </button>
                        </div>
                    )}

                    {/* Mint Progress */}
                    {isMinting && (
                        <div className="mb-5">
                            <MintProgress status={mintStatus} message={mintProgress} />
                        </div>
                    )}

                    {/* Buy button - enabled for cNFT events or events with merkleTreeAddress */}
                    {(event.nftType === 'cnft' || event.merkleTreeAddress) ? (
                        <button
                            onClick={handleBuyClick}
                            disabled={isMinting || isAtLimit || (selectedTicketType?.available || 0) <= 0}
                            className="w-full bg-gradient-to-r from-primary to-violet-600 text-primary-foreground font-bold py-4 rounded-2xl hover:from-primary/90 hover:to-violet-600/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-primary/25 text-base"
                        >
                            {isMinting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processing...
                                </span>
                            ) : isAtLimit ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Ticket className="w-5 h-5" />
                                    Ticket Limit Reached
                                </span>
                            ) : (selectedTicketType?.available || 0) <= 0 ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Ticket className="w-5 h-5" />
                                    Sold Out
                                </span>
                            ) : totalPrice === 0 ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Ticket className="w-5 h-5" />
                                    Get Free Ticket
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <Ticket className="w-5 h-5" />
                                    Buy {ticketQuantity > 1 ? `${ticketQuantity} tickets` : 'ticket'} for {formatPrice(totalPrice)} SOL
                                </span>
                            )}
                        </button>
                    ) : (
                        <button
                            disabled
                            className="w-full bg-muted text-muted-foreground font-semibold py-4 rounded-2xl cursor-not-allowed"
                        >
                            Upgrade event first to buy tickets
                        </button>
                    )}
                </div>

                {/* Resale offers */}
                <div className="mt-6">
                    <ResaleSection
                        eventId={event.id}
                        eventTitle={event.title}
                        eventImage={event.imageUrl || "/no-ticket-svgrepo-com.svg"}
                        originalPrice={event.price}
                    />
                </div>

                {/* About Event Card */}
                <div className="bg-surface rounded-3xl p-6 mt-6 border border-border/50 shadow-sm">
                    <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        About Event
                    </h2>
                    <div className={`text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap ${!showFullDescription && descriptionIsLong ? 'line-clamp-6' : ''}`}>
                        {event.description}
                    </div>
                    {descriptionIsLong && (
                        <button
                            onClick={() => setShowFullDescription(!showFullDescription)}
                            className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                            {showFullDescription ? (
                                <>
                                    Show less
                                    <ChevronUp className="w-4 h-4" />
                                </>
                            ) : (
                                <>
                                    Show more
                                    <ChevronDown className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Venue Card */}
                <div className="bg-surface rounded-3xl p-6 mt-4 border border-border/50 shadow-sm">
                    <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        Venue
                    </h2>
                    <div className="bg-muted/30 rounded-2xl p-4">
                        <div className="text-base font-semibold text-foreground mb-1">{event.company}</div>
                        <div className="text-sm text-muted-foreground leading-relaxed">{event.fullAddress}</div>
                        {event.locationMapUrl ? (
                            <a
                                href={event.locationMapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-2 text-sm text-primary font-medium hover:text-primary/80 transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Open in Maps
                            </a>
                        ) : (
                            <button className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground cursor-not-allowed">
                                <ExternalLink className="w-4 h-4" />
                                No map link provided
                            </button>
                        )}
                    </div>
                </div>

                {/* Organizer Card */}
                <div className="bg-surface rounded-3xl p-6 mt-4 border border-border/50 shadow-sm">
                    <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                        </div>
                        Organizer
                    </h2>
                    <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl">
                        <Link
                            href={event.organizer?.id ? `/profile/${event.organizer.id}` : '#'}
                            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center overflow-hidden flex-shrink-0 border border-border/50 hover:scale-105 transition-transform"
                        >
                            <Image
                                src={event.organizer?.avatar || "/etcha.png"}
                                alt={event.organizer?.name || "Organizer"}
                                width={56}
                                height={56}
                                className="w-full h-full object-cover"
                            />
                        </Link>
                        <div className="flex-1 min-w-0">
                            <Link
                                href={event.organizer?.id ? `/profile/${event.organizer.id}` : '#'}
                                className="text-base font-semibold text-foreground mb-0.5 hover:text-primary transition-colors"
                            >
                                {event.organizer?.name || "Event Organizer"}
                            </Link>
                            <div className="text-xs text-muted-foreground line-clamp-2">{event.organizer?.description || "Professional event organizer"}</div>
                            {followersCount > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                    {followersCount} {followersCount === 1 ? 'follower' : 'followers'}
                                </div>
                            )}
                        </div>
                        {session?.user ? (
                            <button
                                onClick={handleFollowToggle}
                                disabled={isFollowLoading}
                                className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all flex-shrink-0 flex items-center gap-2 disabled:opacity-50 ${isFollowing
                                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                                    }`}
                            >
                                {isFollowLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : isFollowing ? (
                                    <>
                                        <UserCheck className="w-4 h-4" />
                                        Following
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-4 h-4" />
                                        Follow
                                    </>
                                )}
                            </button>
                        ) : (
                            <Link
                                href="/auth/login"
                                className="px-5 py-2.5 bg-primary/10 text-primary text-sm font-semibold rounded-xl hover:bg-primary/20 transition-colors flex-shrink-0 flex items-center gap-2"
                            >
                                <UserPlus className="w-4 h-4" />
                                Follow
                            </Link>
                        )}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                        <button className="flex flex-col items-center justify-center gap-1.5 p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                            <span className="text-xs text-muted-foreground">Contact</span>
                        </button>
                        <button className="flex flex-col items-center justify-center gap-1.5 p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                            <span className="text-xs text-muted-foreground">Policy</span>
                        </button>
                        <button className="flex flex-col items-center justify-center gap-1.5 p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                            <span className="text-xs text-muted-foreground">Report</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Wallet Drawer */}
            <WalletDrawer
                open={isWalletDrawerOpen}
                onOpenChange={setIsWalletDrawerOpen}
            >
                <div />
            </WalletDrawer>

            {/* Mint Result Modal */}
            <MintResultModal
                open={showMintModal}
                onClose={() => {
                    setShowMintModal(false)
                    setIsMinting(false)
                    setMintResult(null)
                    setMintStatus('preparing')
                    setMintProgress('')
                    fetchEvent() // Refresh event data
                }}
                result={mintResult}
                event={event ? {
                    id: event.id,
                    title: event.title,
                    imageUrl: event.imageUrl,
                    date: event.date
                } : null}
            />

            {/* Confirm Buy Modal */}
            {showBuyConfirm && selectedTicketType && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl w-full max-w-md border border-border/50 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                        <div className="p-6 bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl">
                            {/* Event Preview */}
                            <div className="flex items-center gap-4 mb-6 pb-5 border-b border-border">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-muted flex-shrink-0">
                                    <Image
                                        src={event.imageUrl || "/no-ticket-svgrepo-com.svg"}
                                        alt={event.title}
                                        width={64}
                                        height={64}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-bold text-foreground truncate">{event.title}</h3>
                                    <p className="text-sm text-muted-foreground">{formatDate(event.date)} • {event.time}</p>
                                </div>
                            </div>

                            {/* Purchase Details */}
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Ticket Type</span>
                                    <span className="text-sm font-semibold text-foreground">{selectedTicketType.name}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Quantity</span>
                                    <span className="text-sm font-semibold text-foreground">{ticketQuantity} {ticketQuantity > 1 ? 'tickets' : 'ticket'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Price per ticket</span>
                                    <span className="text-sm font-semibold text-foreground">{formatPrice(selectedTicketType.price)} SOL</span>
                                </div>
                                <div className="h-px bg-border my-3" />
                                <div className="flex justify-between items-center">
                                    <span className="text-base font-semibold text-foreground">Total</span>
                                    <span className="text-xl font-bold bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent">{formatPrice(totalPrice)} SOL</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowBuyConfirm(false)}
                                    disabled={isMinting}
                                    className="flex-1 bg-muted text-foreground font-semibold py-3.5 rounded-2xl hover:bg-muted/80 transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={startMint}
                                    disabled={isMinting}
                                    className="flex-1 bg-gradient-to-r from-primary to-violet-600 text-primary-foreground font-bold py-3.5 rounded-2xl hover:from-primary/90 hover:to-violet-600/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/25"
                                >
                                    {isMinting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Processing...
                                        </span>
                                    ) : (
                                        'Confirm Purchase'
                                    )}
                                </button>
                            </div>

                            {/* Security note */}
                            <p className="text-[11px] text-center text-muted-foreground mt-4">
                                Secured by Solana blockchain • Ultra-low fees
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
