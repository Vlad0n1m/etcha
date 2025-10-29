"use client"

import { useState, use, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, Calendar, MapPin, Clock, Plus, Minus, Users, Share2, Loader2 } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import WalletDrawer from "@/components/WalletDrawer"
import CollectionStatus from "@/components/CollectionStatus"
import MintProgress, { MintStatus } from "@/components/MintProgress"
import MintResultModal from "@/components/MintResultModal"
import { mintFromCandyMachine } from "@/lib/utils/candy-machine-client"
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters'
import { fetchCandyMachine, fetchCandyGuard } from "@metaplex-foundation/mpl-candy-machine"


import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Metaplex, keypairIdentity, bundlrStorage, toMetaplexFile, toBigNumber, CreateCandyMachineInput, DefaultCandyGuardSettings, CandyMachineItem, toDateTime, sol, TransactionBuilder, CreateCandyMachineBuilderContext } from "@metaplex-foundation/js";


// Extended event data structure
interface EventData {
    id: string
    title: string
    company: string
    price: number
    date: string
    time: string
    ticketsAvailable: number
    imageUrl: string
    category: string
    description: string
    fullAddress: string
    organizer: {
        name: string
        avatar: string
        description: string
    }
    schedule?: string[]
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
    const [event, setEvent] = useState<EventData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [ticketQuantity, setTicketQuantity] = useState(1)
    const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useState(false)
    const [candyMachineData, setCandyMachineData] = useState(null)
    const [isMinting, setIsMinting] = useState(false)
    const [mintStatus, setMintStatus] = useState<MintStatus>("preparing")
    const [mintProgress, setMintProgress] = useState<string>("")
    const [mintResult, setMintResult] = useState<EventMintResult | null>(null)
    const [showMintModal, setShowMintModal] = useState(false)
    const { connected, publicKey, signTransaction, signAllTransactions, wallet } = useWallet()

    const resolvedParams = use(params)


    // const walletAdapter = useWallet()
    // const umi = createUmi('https://api.devnet.solana.com')
    // // const METAPLEX = Metaplex.make(SOLANA_CONNECTION)
    // // .use(keypairIdentity(WALLET));
    // // const candyMachine = await fetchCandyMachine(umi, CMAddress as PublicKey);
    // // console.log(candyMachine)
    // // // setCandyMachineData(candyMachine);
    // // const { transaction: builtTx } = await umi.builders().mintV2({
    // //     candyMachine: candyMachine.publicKey,
    // //     // payer: walletPubKey, // в Umi это может называться иначе
    // // });

    // umi.use(walletAdapterIdentity(walletAdapter))
    // async function mint(CMAddress: string) {
    //     const METAPLEX = Metaplex.make(SOLANA_CONNECTION));
    // }


    // useEffect(() => {
    //     if (!event?.candyMachineAddress) return;
    //     mint(event.candyMachineAddress)
        
    // }, [event])




    useEffect(() => {
        const fetchEvent = async () => {
            try {
                setIsLoading(true)
                const response = await fetch(`/api/events/${resolvedParams.id}`)
                const data = await response.json()

                if (data.success) {
                    setEvent(data.event)
                } else {
                    setError(data.message || "Event not found")
                }
            } catch (err) {
                console.error("Failed to fetch event:", err)
                setError("Failed to load event")
            } finally {
                setIsLoading(false)
            }
        }

        fetchEvent()
    }, [resolvedParams.id])

    // useEffect(() => {
    //     if (event && event.candyMachineAddress) {

    //     }
    // }, [event, fetchCandyMachineData])

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

    const formatPrice = (price: number): string => {
        if (price >= 1000) {
            return `${(price / 1000).toFixed(0)}k`
        }
        return `${price}`
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            day: "numeric",
            month: "short",
        })
    }

    const handleQuantityChange = (change: number) => {
        const newQuantity = ticketQuantity + change
        if (newQuantity >= 1 && newQuantity <= event.ticketsAvailable) {
            setTicketQuantity(newQuantity)
        }
    }

    const handleBuyClick = async () => {
        if (!connected || !publicKey) {
            setIsWalletDrawerOpen(true)
            return
        }

        if (!event.candyMachineAddress) {
            alert("This event does not have an active NFT collection")
            return
        }

        setIsMinting(true)
        setMintStatus("preparing")
        setMintProgress("Preparing transaction...")

        try {
            // Step 1: Client-side mint (user pays with wallet)
            setMintStatus("minting")
            setMintProgress(`Minting ${ticketQuantity} ticket${ticketQuantity > 1 ? 's' : ''}... Please approve the transaction in your wallet.`)

            console.log('Starting client-side mint...')

            // Create wallet context for minting
            const walletContext = {
                publicKey,
                signTransaction,
                signAllTransactions,
                connected,
                wallet,
            }

            // const { nftMintAddresses, signature } = await mintFromCandyMachine(
            //     event.candyMachineAddress,
            //     walletContext as any, // WalletContextState type compatibility
            //     ticketQuantity
            // )
            const candy = await metaplex.candyMachines().findByAddress({ address: event.candyMachineAddress });

            console.log('Mint successful!', { nftMintAddresses, signature })

            // Step 2: Save to database
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
                    transactionSignature: signature,
                }),
            })

            const result = await response.json()

            if (result.success) {
                setMintStatus("complete")
                setMintProgress("Minted successfully!")
                setMintResult({
                    ...result,
                    nftMintAddresses,
                    transactionSignature: signature,
                })
                setShowMintModal(true)

                // Refresh Candy Machine data
                await fetchCandyMachineData()
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
                // Handle specific error cases
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

    const totalPrice = event.price * ticketQuantity

    return (
        <div className="min-h-screen bg-background pb-24 event-page" style={{ pointerEvents: 'auto' }}>
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
                </div>

                <div className="bg-surface rounded-2xl p-5 mt-4 border border-border">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-foreground">Get Tickets</h2>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Users className="w-3.5 h-3.5" />
                            <span>{event.ticketsAvailable} available</span>
                        </div>
                    </div>

                    <div className="bg-muted/50 rounded-xl p-4 mb-4">
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-3xl font-bold text-foreground">{formatPrice(event.price)}</span>
                            <span className="text-sm font-medium text-muted-foreground">USDC</span>
                        </div>
                        <div className="text-xs text-muted-foreground">per ticket</div>
                    </div>

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
                        {isMinting ? "Minting..." : `Buy for ${formatPrice(totalPrice)} ${event.candyMachineAddress ? "SOL" : "USDC"}`}
                    </button>
                </div>

                <div className="bg-surface rounded-2xl p-5 mt-4 border border-border">
                    <h2 className="text-base font-bold text-foreground mb-3">About Event</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>

                    {event.schedule && (
                        <div className="mt-5 pt-5 border-t border-border">
                            <h3 className="text-sm font-semibold text-foreground mb-3">Schedule</h3>
                            <ul className="space-y-2">
                                {event.schedule.map((item, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <span className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
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
                                src={event.organizer.avatar || "/placeholder.svg"}
                                alt={event.organizer.name}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-foreground mb-0.5">{event.organizer.name}</div>
                            <div className="text-xs text-muted-foreground">{event.organizer.description}</div>
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
                }}
                result={mintResult}
            />
        </div>
    )
}
