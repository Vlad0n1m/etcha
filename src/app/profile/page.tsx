"use client"
import { useWallet } from "@solana/wallet-adapter-react"
import { useState } from "react"
import { Copy, Edit, Eye, TrendingUp, TrendingDown, MoreHorizontal } from "lucide-react"
import WalletDrawer from "@/components/WalletDrawer"
import MobileHeader from "@/components/MobileHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
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

export default function ProfilePage() {
    const { connected, publicKey } = useWallet()
    const [activeTab, setActiveTab] = useState("bought")
    const [copied, setCopied] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [nickname, setNickname] = useState("User")
    const [showValue, setShowValue] = useState(true)

    const formatAddress = (address: string) => {
        return `${address.slice(0, 4)}...${address.slice(-4)}`
    }

    const handleCopy = () => {
        if (publicKey) {
            navigator.clipboard.writeText(publicKey.toString())
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleEditNickname = () => {
        if (isEditing && nickname.trim()) {
            // Here you would update the nickname, for now just toggle
            setIsEditing(false)
        } else {
            setIsEditing(true)
        }
    }

    const ownedTickets = mockTickets.filter(ticket => ["bought", "on_resale", "nft"].includes(ticket.status))
    const totalValue = ownedTickets.reduce((sum, ticket) => sum + ticket.price, 0)
    const totalTickets = ownedTickets.length

    const filteredTickets = mockTickets.filter(ticket => {
        if (activeTab === "bought") return ticket.status === "bought"
        if (activeTab === "on_resale") return ticket.status === "on_resale"
        if (activeTab === "passed") return ticket.status === "passed"
        if (activeTab === "nft") return ticket.status === "nft"
        return true
    })

    if (!connected) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Connect Your Wallet</h2>
                    <p className="text-gray-600 mb-8">Connect your Solana wallet to view your profile</p>
                    <WalletDrawer>
                        <Button size="lg" className="bg-blue-600 text-white hover:bg-blue-700 px-8">
                            Connect Wallet
                        </Button>
                    </WalletDrawer>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <MobileHeader />
            <div className="px-3 pt-24 pb-3">
                <div className="flex flex-col items-start mb-4">
                    <div className="w-16 h-16 rounded-full mb-3 flex items-center justify-center overflow-hidden">
                        <div
                            className="w-full h-full"
                            style={{
                                background:
                                    "repeating-conic-gradient(from 0deg, #FF1493 0deg 45deg, #FF69B4 45deg 90deg, #FF1493 90deg 135deg, #C71585 135deg 180deg)",
                                imageRendering: "pixelated",
                            }}
                        />
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                        {isEditing ? (
                            <Input
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                onBlur={handleEditNickname}
                                onKeyDown={(e) => e.key === "Enter" && handleEditNickname()}
                                className="text-lg font-bold text-gray-900 max-w-48"
                                autoFocus
                            />
                        ) : (
                            <h1 className="text-gray-900 text-xl font-bold">{nickname}</h1>
                        )}
                        <button onClick={handleEditNickname} className="p-1 hover:bg-gray-100 rounded transition-colors">
                            <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button onClick={handleCopy} className="p-1 hover:bg-gray-100 rounded transition-colors" title={copied ? "Copied!" : "Copy address"}>
                            <Copy className={`w-4 h-4 ${copied ? "text-green-500" : "text-gray-500"}`} />
                        </button>
                    </div>

                    <div className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700 font-mono">
                        {formatAddress(publicKey?.toString() || "").toUpperCase()}
                    </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                    <div>
                        <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                            PORTFOLIO VALUE <button onClick={() => setShowValue(!showValue)} className="p-0.5 hover:bg-gray-100 rounded"><Eye className="w-3 h-3" /></button>
                        </div>
                        <div className="text-gray-900 font-bold">{showValue ? totalValue.toFixed(2) : "***"} SOL</div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-xs mb-1">TICKETS</div>
                        <div className="text-gray-900 font-bold">{totalTickets}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-xs mb-1">NFTS</div>
                        <div className="text-gray-900 font-bold">{ownedTickets.filter(t => t.status === "nft").length}</div>
                    </div>
                </div>

                <div className="flex items-center gap-4 border-b border-gray-200 mb-3">
                    {["bought", "on_resale", "passed", "nft"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-2 text-sm font-medium transition-colors ${activeTab === tab ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ')}
                        </button>
                    ))}
                </div>

                <div className="pb-20">
                    {filteredTickets.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                            {filteredTickets.map((ticket) => {
                                const priceChange = ((ticket.marketPrice - ticket.originalPrice) / ticket.originalPrice * 100)
                                const isPositive = priceChange > 0
                                return (
                                    <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block">
                                        <div
                                            className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-md transition-all duration-200 shadow-sm flex flex-col"
                                        >
                                            <div className="aspect-square bg-gray-50 relative flex-shrink-0">
                                                <Image
                                                    src={ticket.eventImage || "/placeholder.svg"}
                                                    alt={ticket.eventTitle}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 flex flex-col p-3 justify-between">
                                                <div className="mb-auto">
                                                    <div className="text-gray-900 text-sm font-semibold line-clamp-2">{ticket.eventTitle}</div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-600 text-xs">{ticket.date}</span>
                                                        <span className="text-gray-600 text-xs font-medium">{ticket.price} SOL</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {isPositive ? <TrendingUp className="w-3 h-3 text-green-600" /> : <TrendingDown className="w-3 h-3 text-red-600" />}
                                                        <span className={`text-xs font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>{priceChange.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="mb-4 relative">
                                <Image
                                    src="/placeholder.svg?height=200&width=300"
                                    alt="No tickets"
                                    width={300}
                                    height={200}
                                    className="w-64 h-48 object-contain"
                                />
                            </div>
                            <h3 className="text-gray-900 text-xl font-bold mb-2">No {activeTab} tickets yet</h3>
                        </div>
                    )}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 p-3">
                <div className="flex items-center gap-2">
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm">List items</Button>
                    <Button variant="outline" className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white text-sm">
                        Accept offers
                    </Button>
                    <button className="p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-gray-600" />
                    </button>
                </div>
            </div>
        </div>
    )
}
