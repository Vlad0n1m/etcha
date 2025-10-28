"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, Upload, Loader2, CheckCircle2 } from "lucide-react"

interface EventOption {
    id: string
    title: string
    date: string
    time: string
    location: string
    category: string
    description: string
    imageUrl: string
    ticketsAvailable: number
    price: number
    organizer: {
        companyName: string
        avatar: string
        description: string
    }
}

export default function CreateCollectionPage() {
    const { connected, publicKey } = useWallet()
    const router = useRouter()

    const [selectedEventId, setSelectedEventId] = useState<string>("")
    const [events, setEvents] = useState<EventOption[]>([])
    const [loadingEvents, setLoadingEvents] = useState(true)

    // Form fields
    const [collectionName, setCollectionName] = useState("")
    const [symbol, setSymbol] = useState("")
    const [description, setDescription] = useState("")
    const [image, setImage] = useState<string>("")
    const [imagePreview, setImagePreview] = useState<string>("")
    const [totalSupply, setTotalSupply] = useState<number>(0)
    const [priceInSol, setPriceInSol] = useState<number>(0)

    // UI states
    const [creating, setCreating] = useState(false)
    const [progress, setProgress] = useState<string>("")
    const [error, setError] = useState<string>("")

    useEffect(() => {
        if (!connected) {
            router.push("/")
        } else {
            // Mock fetch events without collection
            // In real implementation, fetch from API
            setTimeout(() => {
                setEvents([
                    {
                        id: "1",
                        title: "Arcium's <encrypted> Side Track",
                        date: "2024-03-15",
                        time: "19:00",
                        location: "Barcelona, Catalunya",
                        category: "Blockchain",
                        description:
                            "Join us for an exclusive deep dive into Arcium's innovative encrypted side track technology.",
                        imageUrl: "/logo.png",
                        ticketsAvailable: 150,
                        price: 0.5,
                        organizer: {
                            companyName: "Arcium Team",
                            avatar: "/logo.png",
                            description: "Leading blockchain privacy solutions provider",
                        },
                    },
                ])
                setLoadingEvents(false)
            }, 1000)
        }
    }, [connected, router])

    const handleEventSelect = (eventId: string) => {
        setSelectedEventId(eventId)
        const event = events.find((e) => e.id === eventId)
        if (event) {
            setCollectionName(event.title)
            setSymbol("TICKET")
            setDescription(event.description)
            setImagePreview(event.imageUrl)
            setTotalSupply(event.ticketsAvailable)
            setPriceInSol(event.price)
        }
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                const base64 = reader.result as string
                setImage(base64)
                setImagePreview(base64)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleCreateCollection = async () => {
        if (!publicKey || !selectedEventId) return

        setCreating(true)
        setError("")
        setProgress("Uploading assets to Arweave...")

        try {
            const selectedEvent = events.find((e) => e.id === selectedEventId)
            if (!selectedEvent) throw new Error("Event not found")

            const requestBody = {
                eventId: selectedEventId,
                organizerWallet: publicKey.toBase58(),
                totalSupply,
                priceInSol,
                metadata: {
                    name: collectionName,
                    symbol,
                    description,
                    image: image || selectedEvent.imageUrl,
                    eventDate: selectedEvent.date,
                    eventTime: selectedEvent.time,
                    location: selectedEvent.location,
                    category: selectedEvent.category,
                    organizer: {
                        name: selectedEvent.organizer.companyName,
                        avatar: selectedEvent.organizer.avatar,
                        description: selectedEvent.organizer.description,
                    },
                },
            }

            setProgress("Creating collection NFT...")

            const response = await fetch("/api/collections/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            })

            const result = await response.json()

            if (result.success) {
                setProgress("Collection created successfully!")
                setTimeout(() => {
                    router.push(`/organizer/collection/${result.collectionAddress}`)
                }, 2000)
            } else {
                throw new Error(result.message || "Failed to create collection")
            }
        } catch (err: any) {
            console.error("Error creating collection:", err)
            setError(err.message || "Failed to create collection")
            setCreating(false)
        }
    }

    const isFormValid =
        selectedEventId && collectionName && symbol && description && totalSupply > 0 && priceInSol > 0

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Header */}
            <div className="bg-surface/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
                <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
                    <Link
                        href="/organizer"
                        className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span className="font-medium text-sm">Back</span>
                    </Link>
                    <h1 className="text-lg font-bold text-foreground">Create Collection</h1>
                    <div className="w-20"></div>
                </div>
            </div>

            <div className="px-4 max-w-2xl mx-auto py-6 space-y-6">
                {/* Select Event */}
                <div className="bg-surface rounded-2xl p-5 border border-border">
                    <h2 className="text-base font-bold text-foreground mb-4">Select Event</h2>

                    {loadingEvents ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : events.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            No events available for collection creation
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {events.map((event) => (
                                <button
                                    key={event.id}
                                    onClick={() => handleEventSelect(event.id)}
                                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedEventId === event.id
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:border-primary/50 bg-background"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Image
                                            src={event.imageUrl}
                                            alt={event.title}
                                            width={48}
                                            height={48}
                                            className="rounded-lg object-cover"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-semibold text-foreground truncate">
                                                {event.title}
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                {event.date} • {event.ticketsAvailable} tickets
                                            </p>
                                        </div>
                                        {selectedEventId === event.id && (
                                            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Collection Details */}
                {selectedEventId && (
                    <>
                        <div className="bg-surface rounded-2xl p-5 border border-border">
                            <h2 className="text-base font-bold text-foreground mb-4">Collection Details</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Collection Name
                                    </label>
                                    <input
                                        type="text"
                                        value={collectionName}
                                        onChange={(e) => setCollectionName(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="My Event NFT Collection"
                                        maxLength={32}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Max 32 characters</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Symbol</label>
                                    <input
                                        type="text"
                                        value={symbol}
                                        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                                        placeholder="TICKET"
                                        maxLength={10}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Max 10 characters, uppercase</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                        placeholder="Describe your NFT collection..."
                                        rows={4}
                                        maxLength={200}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Max 200 characters</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Collection Image
                                    </label>
                                    <div className="flex items-center gap-4">
                                        {imagePreview && (
                                            <Image
                                                src={imagePreview}
                                                alt="Preview"
                                                width={80}
                                                height={80}
                                                className="rounded-lg object-cover border border-border"
                                            />
                                        )}
                                        <label className="flex-1 cursor-pointer">
                                            <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors">
                                                <Upload className="w-4 h-4" />
                                                <span className="text-sm font-medium">Upload Image</span>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        JPG, PNG, or WebP. Max 5MB
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Supply and Price */}
                        <div className="bg-surface rounded-2xl p-5 border border-border">
                            <h2 className="text-base font-bold text-foreground mb-4">Supply & Pricing</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Total Supply
                                    </label>
                                    <input
                                        type="number"
                                        value={totalSupply}
                                        onChange={(e) => setTotalSupply(parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        min={1}
                                        max={10000}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Number of NFT tickets to mint
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Price per Ticket (SOL)
                                    </label>
                                    <input
                                        type="number"
                                        value={priceInSol}
                                        onChange={(e) => setPriceInSol(parseFloat(e.target.value) || 0)}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        min={0.001}
                                        step={0.001}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Minimum 0.001 SOL</p>
                                </div>

                                <div className="pt-3 border-t border-border">
                                    <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="text-muted-foreground">Revenue Split</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Your share (97.5%)</span>
                                            <span className="font-semibold text-foreground">
                                                {(priceInSol * totalSupply * 0.975).toFixed(4)} SOL
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">Platform fee (2.5%)</span>
                                            <span className="text-foreground">
                                                {(priceInSol * totalSupply * 0.025).toFixed(4)} SOL
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Progress/Error */}
                        {creating && (
                            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                    <div>
                                        <p className="text-sm font-medium text-foreground">Creating Collection...</p>
                                        <p className="text-xs text-muted-foreground">{progress}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                                <p className="text-sm text-destructive">{error}</p>
                            </div>
                        )}

                        {/* Create Button */}
                        <button
                            onClick={handleCreateCollection}
                            disabled={!isFormValid || creating}
                            className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {creating ? "Creating..." : "Create Collection"}
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

