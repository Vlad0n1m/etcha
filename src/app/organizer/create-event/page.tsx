"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, Upload, Loader2, Calendar, MapPin, Tag, Ticket, Leaf, Wallet, Plus, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react"

interface Category {
    id: string
    name: string
    value: string
}

interface TicketTypeInput {
    id: string
    name: string
    price: number
    quantity: number
    description: string
}

export default function CreateEventPage() {
    const { data: session, status } = useSession()
    const { connected, publicKey } = useWallet()
    const router = useRouter()

    // Auth check state
    const [isCheckingAuth, setIsCheckingAuth] = useState(true)

    // Categories
    const [categories, setCategories] = useState<Category[]>([])
    const [loadingCategories, setLoadingCategories] = useState(true)

    // Event fields
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [showDescriptionPreview, setShowDescriptionPreview] = useState(false)
    const [date, setDate] = useState("")
    const [time, setTime] = useState("")
    const [fullAddress, setFullAddress] = useState("")
    const [locationMapUrl, setLocationMapUrl] = useState("")
    const [categoryId, setCategoryId] = useState("")
    const [image, setImage] = useState<string>("")
    const [imagePreview, setImagePreview] = useState<string>("")

    // Ticket types
    const [ticketTypes, setTicketTypes] = useState<TicketTypeInput[]>([
        { id: "1", name: "Standard", price: 0.1, quantity: 100, description: "" }
    ])
    const [maxTicketsPerUser, setMaxTicketsPerUser] = useState<number | null>(null)
    const [symbol, setSymbol] = useState("TICKET")

    // UI states
    const [creating, setCreating] = useState(false)
    const [progress, setProgress] = useState<string>("")
    const [error, setError] = useState<string>("")
    const [currentStep, setCurrentStep] = useState(1)

    // Wait for auth to initialize
    useEffect(() => {
        if (status !== "loading") {
            setIsCheckingAuth(false)
        }
    }, [status])

    useEffect(() => {
        if (isCheckingAuth || status === "loading") {
            return
        }

        // Check if user is authenticated
        if (!session?.user) {
            router.push("/auth/login?callbackUrl=/organizer/create-event")
            return
        }

        // Check if user is an approved organizer
        if (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN") {
            router.push("/dashboard/organizer/request")
            return
        }

        if (session.user.role === "ORGANIZER" && session.user.organizerStatus !== "APPROVED") {
            router.push("/dashboard/organizer/pending")
            return
        }

        // Load categories
        loadCategories()
    }, [session, status, isCheckingAuth, router])

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

    // Ticket type management
    const addTicketType = () => {
        const newId = Date.now().toString()
        setTicketTypes([...ticketTypes, { id: newId, name: "", price: 0, quantity: 0, description: "" }])
    }

    const removeTicketType = (id: string) => {
        if (ticketTypes.length > 1) {
            setTicketTypes(ticketTypes.filter(t => t.id !== id))
        }
    }

    const updateTicketType = (id: string, field: keyof TicketTypeInput, value: string | number) => {
        setTicketTypes(ticketTypes.map(t =>
            t.id === id ? { ...t, [field]: value } : t
        ))
    }

    // Calculate totals
    const totalTickets = ticketTypes.reduce((sum, t) => sum + (t.quantity || 0), 0)
    const totalRevenue = ticketTypes.reduce((sum, t) => sum + (t.price * t.quantity), 0)

    const handleCreateEvent = async () => {
        // Require wallet to be connected for blockchain operations
        if (!session?.user?.walletAddress && !publicKey) {
            setError("Please link your wallet in the dashboard before creating events.")
            return
        }

        const walletAddress = session?.user?.walletAddress || publicKey?.toBase58()
        if (!walletAddress) {
            setError("Wallet address not found. Please link your wallet.")
            return
        }

        // Validate ticket types
        for (const tt of ticketTypes) {
            if (!tt.name.trim()) {
                setError("All ticket types must have a name")
                return
            }
            if (tt.price <= 0) {
                setError(`Ticket type "${tt.name}" must have a price greater than 0`)
                return
            }
            if (tt.quantity <= 0) {
                setError(`Ticket type "${tt.name}" must have a quantity greater than 0`)
                return
            }
        }

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

            // Sort ticket types by price (ascending) and assign sortOrder
            const sortedTicketTypes = [...ticketTypes]
                .sort((a, b) => a.price - b.price)
                .map((t, index) => ({
                    name: t.name,
                    price: t.price,
                    quantity: t.quantity,
                    description: t.description || null,
                    sortOrder: index,
                }))

            // Step 2: Create event + collection
            const eventData = {
                // Event data
                title,
                description,
                date,
                time,
                fullAddress,
                locationMapUrl: locationMapUrl || null,
                categoryId,
                imageUrl: uploadedImageUrl || "/logo.png",
                ticketTypes: sortedTicketTypes,
                maxTicketsPerUser: maxTicketsPerUser || null,
                organizerWallet: walletAddress,

                // Collection metadata
                collectionMetadata: {
                    name: title,
                    symbol: symbol,
                    description: description.substring(0, 500), // NFT metadata description limit
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
    const isStep2Valid = ticketTypes.every(t => t.name && t.price > 0 && t.quantity > 0) && symbol
    const isFormValid = isStep1Valid && isStep2Valid

    // Show loading while checking auth
    if (isCheckingAuth || status === "loading") {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Checking authentication...</p>
                </div>
            </div>
        )
    }

    // Check if wallet is linked
    const hasWallet = session?.user?.walletAddress || (connected && publicKey)

    // Show wallet requirement warning
    if (!hasWallet) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-4">
                <div className="text-center space-y-4 max-w-md">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                        <Wallet className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Wallet Required</h2>
                    <p className="text-sm text-muted-foreground">
                        You need to link a Solana wallet to create events and mint NFT tickets.
                    </p>
                    <div className="flex flex-col gap-2">
                        <Link
                            href="/dashboard/wallet"
                            className="bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-xl hover:bg-primary/90 transition-all"
                        >
                            Link Wallet
                        </Link>
                        <Link
                            href="/dashboard"
                            className="text-sm text-muted-foreground hover:text-foreground"
                        >
                            Back to Dashboard
                        </Link>
                    </div>
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

                                {/* Description - Extended */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-foreground">
                                            Description *
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowDescriptionPreview(!showDescriptionPreview)}
                                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showDescriptionPreview ? (
                                                <>
                                                    <EyeOff className="w-3.5 h-3.5" />
                                                    Edit
                                                </>
                                            ) : (
                                                <>
                                                    <Eye className="w-3.5 h-3.5" />
                                                    Preview
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {showDescriptionPreview ? (
                                        <div className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground min-h-[200px] whitespace-pre-wrap">
                                            {description || <span className="text-muted-foreground">No description yet...</span>}
                                        </div>
                                    ) : (
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y min-h-[200px]"
                                            placeholder="Describe your event in detail...&#10;&#10;You can use multiple paragraphs.&#10;&#10;• Add bullet points&#10;• List features&#10;• Share important info"
                                            maxLength={10000}
                                        />
                                    )}

                                    <div className="flex items-center justify-between mt-1">
                                        <p className="text-xs text-muted-foreground">
                                            Supports line breaks and formatting
                                        </p>
                                        <p className={`text-xs ${description.length > 9000 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                                            {description.length.toLocaleString()}/10,000
                                        </p>
                                    </div>

                                    {/* Progress bar for description */}
                                    <div className="w-full h-1 bg-muted rounded-full mt-2 overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${description.length > 9000 ? 'bg-yellow-500' :
                                                    description.length > 5000 ? 'bg-green-500' : 'bg-primary'
                                                }`}
                                            style={{ width: `${Math.min((description.length / 10000) * 100, 100)}%` }}
                                        />
                                    </div>
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

                                {/* Map Link */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        <ExternalLink className="w-4 h-4 inline mr-1" />
                                        Map Link <span className="text-xs text-muted-foreground">(optional)</span>
                                    </label>
                                    <input
                                        type="url"
                                        value={locationMapUrl}
                                        onChange={(e) => setLocationMapUrl(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="https://maps.google.com/..."
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Google Maps, Yandex Maps, 2GIS, or any other map service
                                    </p>
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
                        {/* cNFT Info Banner */}
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                    <Leaf className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-green-800">Compressed NFT Tickets</p>
                                    <p className="text-xs text-green-600">
                                        Ultra-low fees (~0.0003 SOL/ticket) • Fast minting • Eco-friendly
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Ticket Types */}
                        <div className="bg-surface rounded-2xl p-5 border border-border">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-foreground">
                                    Ticket Types
                                </h2>
                                <button
                                    type="button"
                                    onClick={addTicketType}
                                    className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Type
                                </button>
                            </div>

                            <div className="space-y-4">
                                {ticketTypes.map((ticketType, index) => (
                                    <div
                                        key={ticketType.id}
                                        className="bg-background border border-border rounded-xl p-4 space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-foreground">
                                                Ticket Type {index + 1}
                                            </span>
                                            {ticketTypes.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeTicketType(ticketType.id)}
                                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Name */}
                                            <div className="col-span-2">
                                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                                    Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={ticketType.name}
                                                    onChange={(e) => updateTicketType(ticketType.id, "name", e.target.value)}
                                                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                                    placeholder="Early Bird, VIP, Standard..."
                                                />
                                            </div>

                                            {/* Price */}
                                            <div>
                                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                                    Price (SOL) *
                                                </label>
                                                <input
                                                    type="number"
                                                    value={ticketType.price || ""}
                                                    onChange={(e) => updateTicketType(ticketType.id, "price", parseFloat(e.target.value) || 0)}
                                                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                    min={0.001}
                                                    step={0.001}
                                                    placeholder="0.1"
                                                />
                                            </div>

                                            {/* Quantity */}
                                            <div>
                                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                                    Quantity *
                                                </label>
                                                <input
                                                    type="number"
                                                    value={ticketType.quantity || ""}
                                                    onChange={(e) => updateTicketType(ticketType.id, "quantity", parseInt(e.target.value) || 0)}
                                                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                    min={1}
                                                    max={10000}
                                                    placeholder="100"
                                                />
                                            </div>

                                            {/* Description */}
                                            <div className="col-span-2">
                                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                                    Description <span className="text-muted-foreground">(optional)</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={ticketType.description}
                                                    onChange={(e) => updateTicketType(ticketType.id, "description", e.target.value)}
                                                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                                    placeholder="What's included with this ticket..."
                                                />
                                            </div>
                                        </div>

                                        {/* Type Summary */}
                                        {ticketType.price > 0 && ticketType.quantity > 0 && (
                                            <div className="pt-2 border-t border-border">
                                                <p className="text-xs text-muted-foreground">
                                                    Revenue: <span className="font-semibold text-foreground">{(ticketType.price * ticketType.quantity).toFixed(4)} SOL</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Additional Settings */}
                        <div className="bg-surface rounded-2xl p-5 border border-border">
                            <h2 className="text-base font-bold text-foreground mb-4">
                                Additional Settings
                            </h2>

                            <div className="space-y-4">
                                {/* Max Tickets Per User */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Max Tickets Per Account <span className="text-xs text-muted-foreground">(optional)</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={maxTicketsPerUser ?? ""}
                                        onChange={(e) => setMaxTicketsPerUser(e.target.value ? parseInt(e.target.value) : null)}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        min={1}
                                        placeholder="Leave empty for unlimited"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Limit how many tickets one user can purchase for this event
                                    </p>
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
                                                Total Tickets
                                            </span>
                                            <span className="text-sm font-semibold text-foreground">
                                                {totalTickets.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Total Revenue (if all sold)
                                            </span>
                                            <span className="text-sm font-semibold text-foreground">
                                                {totalRevenue.toFixed(4)} SOL
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Your Share (97.5%)
                                            </span>
                                            <span className="text-base font-bold text-primary">
                                                {(totalRevenue * 0.975).toFixed(4)} SOL
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">
                                                Platform Fee (2.5%)
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {(totalRevenue * 0.025).toFixed(4)} SOL
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
                                            <span className="text-xs text-green-600 flex items-center gap-1">
                                                <Leaf className="w-3 h-3" />
                                                Est. minting cost (cNFT)
                                            </span>
                                            <span className="text-xs text-green-600 font-medium">
                                                ~{(totalTickets * 0.0003).toFixed(4)} SOL
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
                                {creating ? "Creating..." : "Create Event"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
