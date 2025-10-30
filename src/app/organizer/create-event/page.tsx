"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, Upload, Loader2, Calendar, MapPin, Tag, Ticket } from "lucide-react"

interface Category {
    id: string
    name: string
    value: string
}

export default function CreateEventPage() {
    const { connected, connecting, publicKey } = useWallet()
    const router = useRouter()

    // Wallet check state
    const [isCheckingWallet, setIsCheckingWallet] = useState(true)

    // Categories
    const [categories, setCategories] = useState<Category[]>([])
    const [loadingCategories, setLoadingCategories] = useState(true)

    // Event fields
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [date, setDate] = useState("")
    const [time, setTime] = useState("")
    const [fullAddress, setFullAddress] = useState("")
    const [categoryId, setCategoryId] = useState("")
    const [image, setImage] = useState<string>("")
    const [imagePreview, setImagePreview] = useState<string>("")

    // Collection/Ticket fields
    const [ticketsAvailable, setTicketsAvailable] = useState<number>(0)
    const [price, setPrice] = useState<number>(0)
    const [symbol, setSymbol] = useState("TICKET")

    // UI states
    const [creating, setCreating] = useState(false)
    const [progress, setProgress] = useState<string>("")
    const [error, setError] = useState<string>("")
    const [currentStep, setCurrentStep] = useState(1)

    // Wait for wallet to initialize
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsCheckingWallet(false)
        }, 1000)

        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        if (isCheckingWallet || connecting) {
            return
        }

        if (!connected) {
            router.push("/")
        } else {
            // Load categories
            loadCategories()
        }
    }, [connected, connecting, isCheckingWallet, router])

    const loadCategories = async () => {
        try {
            const response = await fetch("/api/categories")
            const data = await response.json()

            if (data.success && data.categories.length > 0) {
                setCategories(data.categories)
            } else {
                setError("No categories available. Please contact support.")
            }
            setLoadingCategories(false)
        } catch (err) {
            console.error("Error loading categories:", err)
            setError("Failed to load categories. Please refresh the page.")
            setLoadingCategories(false)
        }
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError("Image size must be less than 5MB")
                return
            }

            const reader = new FileReader()
            reader.onloadend = () => {
                const base64 = reader.result as string
                setImage(base64)
                setImagePreview(base64)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleCreateEvent = async () => {
        if (!publicKey) return

        setCreating(true)
        setError("")
        setProgress("Uploading event image...")

        try {
            // Step 1: Upload image
            let uploadedImageUrl = ""
            if (image) {
                const formData = new FormData()
                const blob = await (await fetch(image)).blob()
                formData.append("file", blob, "event-image.jpg")

                const uploadResponse = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                })

                if (!uploadResponse.ok) {
                    throw new Error("Failed to upload image")
                }

                const uploadData = await uploadResponse.json()
                uploadedImageUrl = uploadData.url
            }

            setProgress("Creating event and NFT collection...")

            // Step 2: Create event + collection
            const eventData = {
                // Event data
                title,
                description,
                date,
                time,
                fullAddress,
                categoryId,
                imageUrl: uploadedImageUrl || "/logo.png",
                ticketsAvailable,
                price,
                organizerWallet: publicKey.toBase58(),

                // Collection metadata
                collectionMetadata: {
                    name: title,
                    symbol: symbol,
                    description: description,
                    image: uploadedImageUrl || "/logo.png",
                },
            }

            const response = await fetch("/api/events/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(eventData),
            })

            const result = await response.json()

            if (result.success) {
                setProgress("Event and collection created successfully!")
                setTimeout(() => {
                    router.push(`/event/${result.eventId}`)
                }, 2000)
            } else {
                throw new Error(result.message || "Failed to create event")
            }
        } catch (err) {
            console.error("Error creating event:", err)
            setError(err instanceof Error ? err.message : "Failed to create event")
            setCreating(false)
        }
    }

    const isStep1Valid = title && description && date && time && fullAddress && categoryId && imagePreview
    const isStep2Valid = ticketsAvailable > 0 && price > 0 && symbol
    const isFormValid = isStep1Valid && isStep2Valid

    // Show loading while checking wallet
    if (isCheckingWallet || connecting) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Checking wallet connection...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Header */}
            <div className="bg-surface/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
                <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span className="font-medium text-sm">Back</span>
                    </Link>
                    <h1 className="text-lg font-bold text-foreground">Create Event</h1>
                    <div className="w-20"></div>
                </div>
            </div>

            <div className="px-4 max-w-2xl mx-auto py-6 space-y-6">
                {/* Progress Steps */}
                <div className="bg-surface rounded-2xl p-5 border border-border">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setCurrentStep(1)}
                            className={`flex-1 flex flex-col items-center gap-2 ${currentStep === 1 ? "text-primary" : "text-muted-foreground"
                                }`}
                        >
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep === 1
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-foreground"
                                    }`}
                            >
                                <Calendar className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-medium">Event Info</span>
                        </button>

                        <div className="w-12 h-0.5 bg-border"></div>

                        <button
                            onClick={() => isStep1Valid && setCurrentStep(2)}
                            disabled={!isStep1Valid}
                            className={`flex-1 flex flex-col items-center gap-2 ${currentStep === 2 ? "text-primary" : "text-muted-foreground"
                                } disabled:opacity-50`}
                        >
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep === 2
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-foreground"
                                    }`}
                            >
                                <Ticket className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-medium">Tickets</span>
                        </button>
                    </div>
                </div>

                {/* Step 1: Event Details */}
                {currentStep === 1 && (
                    <>
                        <div className="bg-surface rounded-2xl p-5 border border-border">
                            <h2 className="text-base font-bold text-foreground mb-4">Event Details</h2>

                            <div className="space-y-4">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Event Title * <span className="text-xs text-muted-foreground">(max 10 characters)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="Event Name"
                                        maxLength={10}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {title.length}/10 characters
                                    </p>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Description *
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                        placeholder="Describe your event..."
                                        rows={4}
                                        maxLength={500}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {description.length}/500 characters
                                    </p>
                                </div>

                                {/* Date and Time */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Date *
                                        </label>
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Time *
                                        </label>
                                        <input
                                            type="time"
                                            value={time}
                                            onChange={(e) => setTime(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>

                                {/* Location */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        <MapPin className="w-4 h-4 inline mr-1" />
                                        Location *
                                    </label>
                                    <input
                                        type="text"
                                        value={fullAddress}
                                        onChange={(e) => setFullAddress(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="Barcelona, Catalunya"
                                    />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        <Tag className="w-4 h-4 inline mr-1" />
                                        Category *
                                    </label>
                                    {loadingCategories ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            {categories.map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setCategoryId(cat.id)}
                                                    className={`px-4 py-2.5 rounded-lg border-2 transition-all text-sm font-medium ${categoryId === cat.id
                                                        ? "border-primary bg-primary/5 text-primary"
                                                        : "border-border hover:border-primary/50 text-foreground"
                                                        }`}
                                                >
                                                    {cat.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Image Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Event Image *
                                    </label>
                                    <div className="flex items-center gap-4">
                                        {imagePreview && (
                                            <Image
                                                src={imagePreview}
                                                alt="Preview"
                                                width={120}
                                                height={120}
                                                className="rounded-lg object-cover border border-border"
                                            />
                                        )}
                                        <label className="flex-1 cursor-pointer">
                                            <div className="flex items-center justify-center gap-2 px-4 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors border-2 border-dashed border-border">
                                                <Upload className="w-4 h-4" />
                                                <span className="text-sm font-medium">
                                                    {imagePreview ? "Change Image" : "Upload Image"}
                                                </span>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        JPG, PNG, or WebP. Max 5MB. Recommended: 1200x630px
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Next Button */}
                        <button
                            onClick={() => setCurrentStep(2)}
                            disabled={!isStep1Valid}
                            className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next: Ticket Settings
                        </button>
                    </>
                )}

                {/* Step 2: Ticket/Collection Settings */}
                {currentStep === 2 && (
                    <>
                        <div className="bg-surface rounded-2xl p-5 border border-border">
                            <h2 className="text-base font-bold text-foreground mb-4">
                                Ticket & NFT Collection
                            </h2>

                            <div className="space-y-4">
                                {/* Total Supply */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Total Tickets Available *
                                    </label>
                                    <input
                                        type="number"
                                        value={ticketsAvailable}
                                        onChange={(e) => setTicketsAvailable(parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        min={1}
                                        max={10000}
                                        placeholder="150"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Number of NFT tickets to create (1-10,000)
                                    </p>
                                </div>

                                {/* Price */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Price per Ticket (SOL) *
                                    </label>
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        min={0.001}
                                        step={0.001}
                                        placeholder="0.5"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Minimum 0.001 SOL</p>
                                </div>

                                {/* Collection Symbol */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        NFT Symbol *
                                    </label>
                                    <input
                                        type="text"
                                        value={symbol}
                                        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                                        placeholder="TICKET"
                                        maxLength={10}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Max 10 characters, uppercase (e.g., TICKET)
                                    </p>
                                </div>

                                {/* Revenue Split Info */}
                                <div className="pt-3 border-t border-border bg-muted/30 rounded-lg p-4">
                                    <div className="flex items-center justify-between text-sm mb-3">
                                        <span className="font-semibold text-foreground">Revenue Breakdown</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Total Revenue ({ticketsAvailable} × {price} SOL)
                                            </span>
                                            <span className="text-sm font-semibold text-foreground">
                                                {(price * ticketsAvailable).toFixed(4)} SOL
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Your Share (97.5%)
                                            </span>
                                            <span className="text-base font-bold text-primary">
                                                {(price * ticketsAvailable * 0.975).toFixed(4)} SOL
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">
                                                Platform Fee (2.5%)
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {(price * ticketsAvailable * 0.025).toFixed(4)} SOL
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
                                        <p className="text-sm font-medium text-foreground">Creating Event...</p>
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

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setCurrentStep(1)}
                                disabled={creating}
                                className="flex-1 bg-muted text-foreground font-semibold py-3.5 rounded-xl hover:bg-muted/80 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleCreateEvent}
                                disabled={!isFormValid || creating}
                                className="flex-1 bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {creating ? "Creating..." : "Create Event & Collection"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

