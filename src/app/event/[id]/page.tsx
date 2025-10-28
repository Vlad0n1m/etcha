"use client"

import { useState, use, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    ChevronLeft,
    Calendar,
    MapPin,
    Clock,
    Plus,
    Minus,
    Users,
    Share2
} from "lucide-react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { Transaction, VersionedTransaction } from "@solana/web3.js"
import WalletDrawer from "@/components/WalletDrawer"
import ResaleSection from "@/components/ResaleSection"

interface Event {
    id: string
    title: string
    price: number
    date: string
    time: string
    ticketsAvailable: number
    imageUrl: string
    description: string
    fullAddress: string
    category: string
    company: string
    organizerName: string
    organizerAvatar: string
    organizerDescription: string
    schedule: string[]
    candyMachineAddress: string | null
    collectionNftAddress: string | null
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const [ticketQuantity, setTicketQuantity] = useState(1)
    const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useState(false)
    const [event, setEvent] = useState<Event | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isPurchasing, setIsPurchasing] = useState(false)
    const [error, setError] = useState('')

    const { connected, publicKey, signMessage, sendTransaction } = useWallet()
    const { connection } = useConnection()
    const router = useRouter()
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

            const eventData = await response.json()
            setEvent(eventData)
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

    const handleQuantityChange = (change: number) => {
        const newQuantity = ticketQuantity + change
        if (newQuantity >= 1 && newQuantity <= (event?.ticketsAvailable || 0)) {
            setTicketQuantity(newQuantity)
        }
    }

    const handleBuyClick = async () => {
        // Prevent double-clicks and concurrent purchases
        if (isPurchasing) {
            console.log('⚠️ Purchase already in progress, ignoring click')
            return
        }

        if (!connected) {
            setIsWalletDrawerOpen(true)
            return
        }

        if (!event || !publicKey || !sendTransaction) {
            setError('Unable to process purchase')
            return
        }

        setIsPurchasing(true)
        setError('')

        try {
            // Step 1: Get authentication token
            const message = `Purchase ${ticketQuantity} tickets for ${event.title} at ${new Date().toISOString()}`
            if (!signMessage) {
                throw new Error('Wallet not properly connected')
            }
            const signature = await signMessage(new TextEncoder().encode(message))

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

            const { token } = await authResponse.json()

            // Step 2: Prepare purchase transaction
            console.log('📝 Preparing purchase transaction...')
            const prepareResponse = await fetch(`/api/events/${resolvedParams.id}/prepare-purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    quantity: ticketQuantity,
                    walletAddress: publicKey.toString()
                })
            })

            if (!prepareResponse.ok) {
                const errorData = await prepareResponse.json()
                throw new Error(errorData.error || 'Failed to prepare purchase')
            }

            const { transaction: base64Transaction, totalPrice } = await prepareResponse.json()

            // Step 3: Deserialize and send transaction
            console.log('💳 Processing transaction...')
            console.log(`💰 Total cost: ${totalPrice} SOL`)
            console.log('🔏 Transaction is partially signed by backend (NFT mint + collection authority)')
            console.log('✍️ User will sign and pay through wallet')

            const transactionBuffer = Buffer.from(base64Transaction, 'base64')
            let transaction: Transaction | VersionedTransaction

            // Umi framework creates versioned transactions
            try {
                transaction = VersionedTransaction.deserialize(transactionBuffer)
                console.log('🔍 Versioned transaction detected')
                console.log('🔍 Backend signatures:', transaction.signatures.length)
            } catch (error) {
                console.error('❌ Failed to deserialize as versioned transaction:', error)
                // If it fails, try as legacy transaction
                try {
                    transaction = Transaction.from(transactionBuffer)
                    console.log('🔍 Legacy transaction detected')
                } catch (legacyError) {
                    console.error('❌ Failed to deserialize as legacy transaction:', legacyError)
                    throw new Error('Failed to deserialize transaction. Invalid transaction format.')
                }
            }

            console.log(`✍️ User wallet: ${publicKey?.toBase58()}`)
            console.log('📤 Sending transaction (wallet will sign and submit)...')

            // Use sendTransaction which handles both signing and sending
            // It will work with partially-signed transactions
            let transactionSignature: string
            try {
                transactionSignature = await sendTransaction(transaction, connection, {
                    skipPreflight: false,
                    preflightCommitment: 'confirmed',
                })
                console.log('✅ Transaction sent:', transactionSignature)
            } catch (sendError: unknown) {
                console.error('❌ Failed to send transaction:', sendError)
                const errorMessage = sendError instanceof Error ? sendError.message : String(sendError)

                // Better error messages
                if (errorMessage.includes('User rejected') || errorMessage.includes('rejected') || errorMessage.includes('cancelled')) {
                    throw new Error('Transaction cancelled by user')
                } else if (errorMessage.includes('insufficient funds') || errorMessage.includes('Insufficient')) {
                    throw new Error('Insufficient SOL balance for purchase')
                } else if (errorMessage.includes('Unexpected error')) {
                    throw new Error('Wallet error. Please try refreshing the page or using a different wallet.')
                } else {
                    throw new Error(`Transaction failed: ${errorMessage}`)
                }
            }

            console.log('⏳ Waiting for confirmation...')

            // Step 4: Wait for confirmation
            const confirmation = await connection.confirmTransaction(transactionSignature, 'confirmed')

            if (confirmation.value.err) {
                throw new Error('Transaction failed on blockchain')
            }

            console.log('✅ Transaction confirmed on blockchain')

            // Step 5: Confirm purchase on backend
            console.log('📝 Recording purchase in database...')
            const confirmResponse = await fetch(`/api/events/${resolvedParams.id}/confirm-purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    transactionSignature,
                    walletAddress: publicKey.toString(),
                    quantity: ticketQuantity
                })
            })

            if (!confirmResponse.ok) {
                const errorData = await confirmResponse.json()
                throw new Error(errorData.error || 'Failed to confirm purchase')
            }

            const confirmData = await confirmResponse.json()
            console.log('🎉 Purchase confirmed!', confirmData)

            // Update event data to reflect new ticket count
            setEvent((prev: Event | null) => {
                if (!prev) return null
                return {
                    ...prev,
                    ticketsAvailable: prev.ticketsAvailable - ticketQuantity
                }
            })

            // Redirect to profile page
            router.push('/profile')
        } catch (err) {
            console.error('❌ Purchase error:', err)
            setError(err instanceof Error ? err.message : 'Purchase failed')
        } finally {
            setIsPurchasing(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 border-t-transparent"></div>
            </div>
        )
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-foreground mb-4">Event Not Found</h1>
                    <Link href="/" className="text-primary hover:text-primary/80 font-medium">
                        ← Back to Events
                    </Link>
                </div>
            </div>
        )
    }

    const totalPrice = event.price * ticketQuantity

    return (
        <div className="min-h-screen bg-background pb-24" style={{ pointerEvents: 'auto' }}>
            <div className="bg-surface/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
                <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
                    <Link href="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                        <span className="font-medium text-sm">Back</span>
                    </Link>
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <Share2 className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>
            </div>

            <div className="relative h-56 w-full">
                <Image src={event.imageUrl || "/placeholder.svg"} alt={event.title} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

                <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/90 text-primary-foreground backdrop-blur-sm">
                        {event.category}
                    </span>
                </div>
            </div>

            <div className="px-4 max-w-2xl mx-auto">
                <div className="bg-surface rounded-2xl p-5 -mt-8 relative z-10 border border-border shadow-lg">
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-foreground mb-2 leading-tight">{event.title}</h1>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="font-medium">{event.company}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                        <div className="flex items-start gap-2">
                            <Calendar className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                                <div className="text-xs text-muted-foreground">Date</div>
                                <div className="text-sm font-medium text-foreground">{formatDate(event.date)}</div>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <Clock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                                <div className="text-xs text-muted-foreground">Time</div>
                                <div className="text-sm font-medium text-foreground">{event.time} GMT+2</div>
                            </div>
                        </div>

                        <div className="flex items-start gap-2 col-span-2">
                            <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                                <div className="text-xs text-muted-foreground">Location</div>
                                <div className="text-sm font-medium text-foreground">Barcelona, Catalunya</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-muted/50 rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-foreground">Get Tickets</h2>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Users className="w-3.5 h-3.5" />
                                <span>{event.ticketsAvailable} available</span>
                            </div>
                        </div>

                        {/* Blockchain Info - for debugging/verification */}
                        {event.candyMachineAddress && event.collectionNftAddress && (
                            <div className="mb-4 p-3 bg-background/50 rounded-lg border border-border">
                                <div className="text-xs font-semibold text-foreground mb-2">Blockchain Info</div>
                                <div className="space-y-1 text-xs text-muted-foreground font-mono">
                                    <div className="truncate">
                                        <span className="text-foreground">Candy Machine:</span> {event.candyMachineAddress}
                                    </div>
                                    <div className="truncate">
                                        <span className="text-foreground">Collection NFT:</span> {event.collectionNftAddress}
                                    </div>
                                </div>
                            </div>
                        )}

                        {event.price > 0 && (
                            <div className="bg-muted/50 rounded-xl p-4 mb-4">
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="text-3xl font-bold text-foreground">{formatPrice(event.price)}</span>
                                    <span className="text-sm font-medium text-muted-foreground">SOL</span>
                                </div>
                                <div className="text-xs text-muted-foreground">per ticket</div>
                            </div>
                        )}

                        {event.price > 0 && (
                            <div className="flex items-center justify-between mb-5">
                                <span className="text-sm font-medium text-foreground">Quantity</span>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleQuantityChange(-1)}
                                        disabled={ticketQuantity <= 1}
                                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Minus className="w-4 h-4 text-foreground" />
                                    </button>
                                    <span className="text-lg font-bold text-foreground min-w-[2rem] text-center">{ticketQuantity}</span>
                                    <button
                                        onClick={() => handleQuantityChange(1)}
                                        disabled={ticketQuantity >= event.ticketsAvailable}
                                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Plus className="w-4 h-4 text-foreground" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleBuyClick}
                            disabled={isPurchasing}
                            className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPurchasing ? 'Processing...' : event.price === 0 ? 'Get Ticket' : `Buy for ${formatPrice(totalPrice)} SOL`}
                        </button>
                    </div>

                    {/* Resale Marketplace Section */}
                    <ResaleSection
                        eventId={event.id}
                        eventTitle={event.title}
                        eventImage={event.imageUrl}
                        originalPrice={event.price}
                    />

                    <div className="bg-surface rounded-2xl p-5 mt-4 border border-border">
                        <h2 className="text-base font-bold text-foreground mb-3">About Event</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>

                        {event.schedule && event.schedule.length > 0 && (
                            <div className="mt-5 pt-5 border-t border-border">
                                <h3 className="text-sm font-semibold text-foreground mb-3">Schedule</h3>
                                <ul className="space-y-2">
                                    {event.schedule.map((item: string, index: number) => (
                                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                                            <span className="w-1 h-1 rounded-full bg-primary/20 text-primary flex-shrink-0 mt-2"></span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="bg-surface rounded-2xl p-5 mt-4 border border-border">
                        <h2 className="text-base font-bold text-foreground mb-3">Venue</h2>
                        <div className="text-sm font-medium text-foreground mb-1">{event.company}</div>
                        <div className="text-sm text-muted-foreground leading-relaxed">{event.fullAddress}</div>
                    </div>

                    <div className="bg-surface rounded-2xl p-5 mt-4 border border-border">
                        <h2 className="text-base font-bold text-foreground mb-4">Organizer</h2>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                                <Image
                                    src={event.organizerAvatar || "/placeholder.svg"}
                                    alt={event.organizerName || "Organizer Name"}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-foreground mb-0.5">{event.organizerName}</div>
                                <div className="text-xs text-muted-foreground">{event.organizerDescription}</div>
                            </div>
                            <button className="px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-lg hover:bg-muted/80 transition-colors flex-shrink-0">
                                Follow
                            </button>
                        </div>

                        <div className="pt-4 border-t border-border space-y-2">
                            <button className="w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
                                Contact organizer
                            </button>
                            <button className="w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
                                Return policy
                            </button>
                            <button className="w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
                                Report event
                            </button>
                        </div>
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
        </div>
    )
}
