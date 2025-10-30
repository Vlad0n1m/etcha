"use client"

import { useState, use, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, Calendar, MapPin, Clock, Loader2 } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import WalletDrawer from "@/components/WalletDrawer"
import CollectionStatus from "@/components/CollectionStatus"
import MintProgress, { MintStatus } from "@/components/MintProgress"
import MintResultModal from "@/components/MintResultModal"
import { useSignature } from "@/components/SignatureProvider"
import ResaleSection from "@/components/ResaleSection"
import { Button } from "@/components/ui/button"


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
    category?: string
    company?: string
    organizer: {
        name: string
        avatar: string
        description: string
    }
    // schedule?: string[] // Disabled for MVP
    candyMachineAddress?: string
    collectionNftAddress?: string
}

interface CandyMachineData {
    success: boolean
    itemsAvailable: number
    itemsRedeemed: number
    itemsRemaining: number
    price: number
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
    const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useState(false)
    const [candyMachineData, setCandyMachineData] = useState<CandyMachineData | null>(null)
    const [isMinting, setIsMinting] = useState(false)
    const [mintStatus, setMintStatus] = useState<MintStatus>("preparing")
    const [mintProgress, setMintProgress] = useState<string>("")
    const [mintResult, setMintResult] = useState<EventMintResult | null>(null)
    const [showMintModal, setShowMintModal] = useState(false)
    const [showBuyConfirm, setShowBuyConfirm] = useState(false)
    const [internalBalance, setInternalBalance] = useState<number | null>(null)
    const { signature, derivedAddress, refreshSignature } = useSignature()
    const [copiedAddress, setCopiedAddress] = useState(false)

    const { connected, publicKey, signTransaction, wallet, signMessage } = useWallet()
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

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-6)}`
    }

    const handleQuantityChange = (change: number) => {
        const newQuantity = ticketQuantity + change
        if (newQuantity >= 1 && newQuantity <= (event?.ticketsAvailable || 0)) {
            setTicketQuantity(newQuantity)
        }
    }

    const handleCopyDerivedAddress = async () => {
        if (!derivedAddress) return

        try {
            await navigator.clipboard.writeText(derivedAddress)
            setCopiedAddress(true)
            setTimeout(() => setCopiedAddress(false), 2000)
        } catch (err) {
            console.error("Failed to copy address:", err)
        }
    }

    const startMint = async () => {
        if (!connected || !publicKey || !wallet || !signTransaction) {
            setIsWalletDrawerOpen(true)
            return
        }

        if (!event.candyMachineAddress) {
            alert("This event does not have an active NFT collection")
            return
        }

        setShowBuyConfirm(false)
        setIsMinting(true)
        setMintStatus("preparing")
        setMintProgress("Requesting signature...")

        try {
            if (!signature) {
                throw new Error('Please wait for wallet address to be generated. Sign the message when prompted.')
            }

            setMintStatus("minting")
            setMintProgress(`Minting ${ticketQuantity} ticket${ticketQuantity > 1 ? 's' : ''}... Please approve the transaction in your wallet.`)

            const signatureHex = Array.from(signature)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')

            const mintResponse = await fetch('/api/mint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: event.id,
                    candyMachineAddress: event.candyMachineAddress,
                    buyerWallet: publicKey.toBase58(),
                    quantity: ticketQuantity,
                    signature: signatureHex,
                }),
            })

            const mintResult = await mintResponse.json()

            if (!mintResult.success) {
                throw new Error(mintResult.message || 'Failed to mint NFT tickets')
            }

            const nftMintAddresses = mintResult.nftMintAddresses || []
            const txSignature = mintResult.transactionSignature || ''

            setMintProgress("Saving ticket information...")

            const response = await fetch("/api/mint/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    eventId: event.id,
                    candyMachineAddress: event.candyMachineAddress,
                    buyerWallet: publicKey.toBase58(),
                    quantity: ticketQuantity,
                    nftMintAddresses,
                    transactionSignature: txSignature,
                }),
            })

            const result = await response.json()

            if (result.success) {
                setMintStatus("complete")
                setMintProgress("Minted successfully!")
                setMintResult({
                    ...result,
                    nftMintAddresses,
                    transactionSignature: txSignature,
                })
                setShowMintModal(true)
            } else {
                setMintStatus("error")
                setMintProgress(result.message || "Failed to save ticket information")
                setTimeout(() => setIsMinting(false), 3000)
            }
        } catch (error: unknown) {
            console.error("Mint error:", error)
            setMintStatus("error")
            let errorMessage = "Failed to mint NFT tickets"

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
        setShowBuyConfirm(true)
    }


    // Ensure signature exists on mount/change
    useEffect(() => {
        if (connected && publicKey && !signature) {
            void refreshSignature()
        }
    }, [connected, publicKey, signature, refreshSignature])

    // Load internal wallet balance when signature is available
    useEffect(() => {
        const loadBalance = async () => {
            if (!connected || !publicKey || !signature) return
            try {
                const sigHex = Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('')
                const resp = await fetch('/api/wallet/balance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ walletAddress: publicKey.toBase58(), signature: sigHex }),
                })
                const data = await resp.json()
                if (data?.success && typeof data.balance === 'number') {
                    setInternalBalance(data.balance)
                }
            } catch {
                // ignore for header UI
            }
        }
        void loadBalance()
    }, [connected, publicKey, signature])

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading event...</p>
                </div>
            </div>
        )
    }

    // Error or not found state
    if (error || !event) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-foreground mb-4">
                        {error || "Event Not Found"}
                    </h1>
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
                    <div className="flex items-center gap-2">
                        {internalBalance !== null && (
                            <span className="text-xs font-medium text-muted-foreground">
                                {internalBalance.toFixed(3)} SOL
                            </span>
                        )}
                        {connected ? (
                            <WalletDrawer>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-2 border-green-500 text-green-700 hover:bg-green-50"
                                >
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    {formatAddress(publicKey?.toString() || "")}
                                </Button>
                            </WalletDrawer>
                        ) : (
                            <WalletDrawer>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-purple-500 text-white hover:bg-purple-600"
                                >
                                    Connect Wallet
                                </Button>
                            </WalletDrawer>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative h-56 w-full">
                <Image
                    src={event.imageUrl || "/no-ticket-svgrepo-com.svg"}
                    alt={event.title ? `${event.title} event cover image` : "Event cover image"}
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

                <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/90 text-primary-foreground backdrop-blur-sm">
                        {event.category}
                    </span>
                </div>
            </div>

            <div className="px-4 max-w-2xl mx-auto">
                {/* Collection Status */}
                {event.candyMachineAddress && candyMachineData && (
                    <div className="bg-surface rounded-2xl p-4 -mt-4 mb-4 relative z-10 border border-border shadow-lg">
                        <CollectionStatus
                            candyMachineAddress={event.candyMachineAddress}
                            showDetails={false}
                        />
                    </div>
                )}

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

                    {event.price > 0 && (
                        <div className="bg-muted/50 rounded-xl p-4 mb-4">
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-3xl font-bold text-foreground">{formatPrice(event.price)}</span>
                                <span className="text-sm font-medium text-muted-foreground">SOL</span>
                            </div>
                            <div className="text-xs text-muted-foreground">per ticket</div>
                        </div>
                    )}



                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">
                            {error}
                        </div>
                    )}



                    {/* Mint Progress */}
                    {isMinting && (
                        <div className="mb-4">
                            <MintProgress status={mintStatus} message={mintProgress} />
                        </div>
                    )}

                    <button
                        onClick={handleBuyClick}
                        disabled={isMinting}
                        className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isMinting ? "Minting..." : event.price === 0 ? 'Get Ticket' : `Buy for ${formatPrice(totalPrice)} SOL`}
                    </button>
                </div>

                {/* Resale offers */}
                <div className="mt-4">
                    <ResaleSection
                        eventId={event.id}
                        eventTitle={event.title}
                        eventImage={event.imageUrl || "/no-ticket-svgrepo-com.svg"}
                        originalPrice={event.price}
                    />
                </div>

                <div className="bg-surface rounded-2xl p-5 mt-4 border border-border">
                    <h2 className="text-base font-bold text-foreground mb-3">About Event</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>

                    {/* Schedule disabled for MVP */}
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
                                src={event.organizer?.avatar || "/etcha.png"}
                                alt={event.organizer?.name || "Organizer"}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-foreground mb-0.5">{event.organizer?.name || "Event Organizer"}</div>
                            <div className="text-xs text-muted-foreground">{event.organizer?.description || "Professional event organizer"}</div>
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
                }}
                result={mintResult}
            />

            {/* Confirm Buy Modal */}
            {showBuyConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-surface rounded-2xl w-full max-w-sm border border-border shadow-xl">
                        <div className="p-5">
                            <h3 className="text-base font-bold text-foreground mb-2">Confirm Purchase</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Are you sure you want to buy this ticket for {formatPrice(totalPrice)} SOL?
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowBuyConfirm(false)}
                                    disabled={isMinting}
                                    className="flex-1 bg-muted text-foreground font-medium py-2.5 rounded-xl hover:bg-muted/80 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={startMint}
                                    disabled={isMinting}
                                    className="flex-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {isMinting ? 'Processing...' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
