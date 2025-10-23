"use client"

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useWallet } from "@solana/wallet-adapter-react"
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Copy, QrCode, ArrowRight, ArrowLeft } from "lucide-react"
import MobileHeader from "@/components/MobileHeader"

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
    {
        id: "3",
        eventTitle: "Solana Dev Meetup",
        eventImage: "/logo.png",
        date: "2024-04-10",
        time: "18:00",
        location: "Miami, FL",
        price: 0.7,
        originalPrice: 0.5,
        marketPrice: 0.8,
        status: "passed" as const,
        nftId: "C1d3E5f7G9h1I3j5K7l9M1n3O5p7Q9r1",
    },
    {
        id: "4",
        eventTitle: "Crypto Art Auction",
        eventImage: "/logo.png",
        date: "2024-05-05",
        time: "20:00",
        location: "Los Angeles, CA",
        price: 1.2,
        originalPrice: 1.0,
        marketPrice: 1.5,
        status: "nft" as const,
        nftId: "D2e4F6g8H0i2J4k6L8m0N2o4P6q8R0s2",
    },
    {
        id: "5",
        eventTitle: "Web3 Conference",
        eventImage: "/logo.png",
        date: "2024-06-15",
        time: "16:00",
        location: "Berlin, Germany",
        price: 0.4,
        originalPrice: 0.35,
        marketPrice: 0.45,
        status: "bought" as const,
        nftId: "E3f5G7h9I1j3K5l7M9n1O3p5Q7r9S1t3",
    },
]

export default function TicketDetailPage() {
    const params = useParams()
    const { connected } = useWallet()
    const ticketId = params.id as string
    const ticket = mockTickets.find(t => t.id === ticketId)

    if (!ticket || !connected) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Ticket Not Found</h2>
                    <p className="text-gray-600">Please connect your wallet or check the ticket ID.</p>
                </div>
            </div>
        )
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    }

    const handleUseTicket = () => {
        // TODO: Generate QR or use ticket logic
        alert('QR Code or Use Ticket functionality - to be implemented')
    }

    return (
        <div className="min-h-screen bg-background">
            <MobileHeader />
            <div className="px-4 pt-20">
                <Link href="/profile" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Profile
                </Link>

                <div className="bg-white rounded-xl overflow-hidden shadow-sm mb-6 relative">
                    <div className="h-64 relative">
                        <Image
                            src={ticket.eventImage}
                            alt={ticket.eventTitle}
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="p-4 pb-2 -mt-8 bg-white rounded-t-xl z-10 relative">
                        <h1 className="text-xl font-bold text-gray-900 mb-2">{ticket.eventTitle}</h1>
                        <div className="space-y-2 text-gray-600 mb-2">
                            <div className="flex items-center gap-2">
                                <span>📅</span>
                                <span>{formatDate(ticket.date)} at {ticket.time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span>📍</span>
                                <span>{ticket.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span>💰</span>
                                <span>Your Price: {ticket.price} SOL</span>
                            </div>
                            {ticket.nftId && (
                                <div className="flex items-center gap-2">
                                    <span>🆔</span>
                                    <span>NFT ID: {ticket.nftId.slice(0, 8)}...{ticket.nftId.slice(-4)}</span>
                                </div>
                            )}
                        </div>
                        <Link
                            href={`/event/${ticket.id}`}
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mb-2"
                        >
                            View Event Details
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                <div className="space-y-4">
                    {ticket.status === 'on_resale' ? (
                        <Button
                            onClick={() => {
                                // TODO: Remove from resale logic (e.g., update status to 'bought')
                                alert('Ticket removed from resale')
                                // In real app, call API or update state
                            }}
                            className="w-full text-white flex items-center gap-2 bg-red-600 hover:bg-red-700"
                            variant="destructive"
                        >
                            Remove from Resale
                        </Button>
                    ) : (
                        <>
                            <Button onClick={handleUseTicket} className="w-full flex items-center gap-2 bg-green-600 hover:bg-green-700" disabled={ticket.status === 'passed'}>
                                <QrCode className="w-4 h-4" />
                                Generate QR / Use Ticket
                            </Button>

                            {ticket.status === 'bought' && (
                                <Link href={`/resale/submit/${ticket.id}`}>
                                    <Button variant="outline" className="w-full border-gray-300">
                                        List on Resale
                                    </Button>
                                </Link>
                            )}
                        </>
                    )}

                    {ticket.status === 'nft' && (
                        <Button variant="outline" className="w-full border-gray-300" disabled>
                            NFT Details
                        </Button>
                    )}

                    {ticket.status === 'passed' && (
                        <div className="text-center text-gray-500 text-sm">
                            This event has passed. Ticket is no longer usable.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
