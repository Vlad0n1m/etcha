"use client"

import { useState, use } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, Calendar, MapPin, Clock, Plus, Minus, Users, Share2 } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import WalletDrawer from "@/components/WalletDrawer"

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
}

// Mock detailed event data
const eventDetails: Record<string, EventData> = {
    "1": {
        id: "1",
        title: "Arcium's <encrypted> Side Track",
        company: "Arcium",
        price: 20000,
        date: "2024-03-15",
        time: "19:00",
        ticketsAvailable: 150,
        imageUrl: "/logo.png",
        category: "Blockchain",
        description:
            "Join us for an exclusive deep dive into Arcium's innovative encrypted side track technology. This event will cover the latest developments in privacy-preserving blockchain solutions and their practical applications in DeFi.",
        fullAddress: "Tech Conference Center, 123 Innovation Street, San Francisco, CA 94105",
        organizer: {
            name: "Arcium Team",
            avatar: "/logo.png",
            description: "Leading blockchain privacy solutions provider",
        },
        schedule: [
            "19:00 - Welcome & Introduction",
            "19:15 - Technical Deep Dive",
            "20:30 - Q&A Session",
            "21:00 - Networking",
        ],
    },
    "2": {
        id: "2",
        title: "Blockchain Security Workshop",
        company: "Crypto Ventures",
        price: 8000,
        date: "2024-03-15",
        time: "21:30",
        ticketsAvailable: 75,
        imageUrl: "/logo.png",
        category: "Blockchain",
        description:
            "Comprehensive workshop covering the latest blockchain security best practices, smart contract auditing, and vulnerability assessment techniques.",
        fullAddress: "Crypto Hub, 456 Blockchain Avenue, New York, NY 10001",
        organizer: {
            name: "Crypto Ventures",
            avatar: "/logo.png",
            description: "Blockchain security experts and consultants",
        },
    },
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const [ticketQuantity, setTicketQuantity] = useState(1)
    const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useState(false)
    const { connected } = useWallet()

    const resolvedParams = use(params)
    const event = eventDetails[resolvedParams.id]


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

    const handleBuyClick = () => {
        if (!connected) {
            setIsWalletDrawerOpen(true)
        } else {
            // Здесь будет логика покупки билетов
            console.log("Processing purchase...", { eventId: event.id, quantity: ticketQuantity, totalPrice })
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

                    <button
                        onClick={handleBuyClick}
                        className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl hover:bg-primary/90 transition-all active:scale-[0.98]"
                    >
                        Buy for {formatPrice(totalPrice)} USDC
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
        </div>
    )
}
