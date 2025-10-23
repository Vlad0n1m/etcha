"use client"

import { useParams } from 'next/navigation'
import { useWallet } from "@solana/wallet-adapter-react"
import { useState } from 'react'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, TrendingUp } from "lucide-react"
import MobileHeader from "@/components/MobileHeader"
import Link from 'next/link'

const mockTickets = [
    {
        id: "1",
        eventTitle: "Arcium's <encrypted> Side Track",
        eventImage: "/logo.png",
        date: "2024-03-15",
        time: "19:00",
        location: "San Francisco, CA",
        price: 0.5,
        originalPrice: 0.4,
        marketPrice: 0.6,
        status: "bought" as const,
        nftId: "A7x9K2mP4nQ8rT1vW5yZ3bC6dE9fH2jL",
    },
    {
        id: "2",
        eventTitle: "Blockchain Security Workshop",
        eventImage: "/logo.png",
        date: "2024-03-20",
        time: "21:30",
        location: "New York, NY",
        price: 0.3,
        originalPrice: 0.3,
        marketPrice: 0.35,
        status: "on_resale" as const,
        nftId: "B3c5D7e9F1g3H5i7J9k1L3m5N7o9P1q3",
    },
    // ... other mock tickets
]

export default function ResaleSubmitPage() {
    const params = useParams()
    const { connected } = useWallet()
    const [price, setPrice] = useState('')
    const ticketId = params.id as string
    const ticket = mockTickets.find(t => t.id === ticketId)

    if (!ticket || !connected || ticket.status !== 'bought') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Invalid Ticket</h2>
                    <p className="text-gray-600">This ticket cannot be listed for resale.</p>
                    <Link href="/profile">
                        <Button className="mt-4">Back to Profile</Button>
                    </Link>
                </div>
            </div>
        )
    }

    // Mock market data for hints
    const similarListings = mockTickets.filter(t => t.eventTitle === ticket.eventTitle && t.status === 'on_resale')
    const averageMarketPrice = similarListings.length > 0
        ? similarListings.reduce((sum, t) => sum + t.marketPrice, 0) / similarListings.length
        : ticket.marketPrice || ticket.price * 1.2
    const suggestedLow = (averageMarketPrice * 0.9).toFixed(2)
    const suggestedHigh = (averageMarketPrice * 1.3).toFixed(2)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!price || parseFloat(price) <= 0) {
            alert('Please enter a valid price')
            return
        }
        // TODO: Submit to resale marketplace
        alert(`Ticket listed for ${price} SOL`)
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    }

    return (
        <div className="min-h-screen bg-background">
            <MobileHeader />
            <div className="px-4 pt-24 pb-20">
                <Link href={`/tickets/${ticket.id}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Ticket
                </Link>

                <div className="bg-white rounded-xl overflow-hidden shadow-sm mb-6">
                    <div className="aspect-square relative">
                        <Image
                            src={ticket.eventImage}
                            alt={ticket.eventTitle}
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="p-6">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">{ticket.eventTitle}</h1>
                        <div className="space-y-2 text-gray-600 mb-4">
                            <div className="flex items-center gap-2">
                                <span>📅</span>
                                <span>{formatDate(ticket.date)} at {ticket.time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span>📍</span>
                                <span>{ticket.location}</span>
                            </div>
                        </div>
                        <div className="text-sm text-gray-500 mb-4">
                            Your purchase price: {ticket.price} SOL
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Listing Price (SOL)</label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder={averageMarketPrice.toFixed(2)}
                            className="w-full"
                        />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium text-gray-900 mb-2">Market Insights</h3>
                        <div className="space-y-1 text-sm text-gray-600">
                            <div>Average market price: <span className="font-semibold">{averageMarketPrice.toFixed(2)} SOL</span></div>
                            {similarListings.length > 0 && <div>{similarListings.length} similar listings</div>}
                            <div>Suggested range: {suggestedLow} - {suggestedHigh} SOL</div>
                            <div className="flex items-center gap-1 mt-2">
                                <TrendingUp className="w-3 h-3 text-green-600" />
                                <span>Tip: Price competitively to sell faster</span>
                            </div>
                        </div>
                    </div>

                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                        List for Sale
                    </Button>
                </form>

                <div className="text-center text-xs text-gray-500 mt-4">
                    Listing fees: 2.5% + network gas
                </div>
            </div>
        </div>
    )
}
