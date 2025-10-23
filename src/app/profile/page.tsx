"use client"
import { useWallet } from "@solana/wallet-adapter-react"
import { useState } from "react"
import { Search, Grid3x3, Settings, Copy, Edit, MoreHorizontal, Eye } from "lucide-react"
import WalletDrawer from "@/components/WalletDrawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"

const mockTickets = [
    {
        id: "1",
        eventTitle: "Arcium's <encrypted> Side Track",
        eventImage: "/logo.png",
        date: "2024-03-15",
        time: "19:00",
        location: "San Francisco, CA",
        price: 0.5,
        status: "purchased" as const,
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
        status: "purchased" as const,
        nftId: "B3c5D7e9F1g3H5i7J9k1L3m5N7o9P1q3",
    },
]

export default function ProfilePage() {
    const { connected, publicKey } = useWallet()
    const [activeTab, setActiveTab] = useState("nfts")
    const [, setCopied] = useState(false)

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

    const totalValue = mockTickets.reduce((sum, ticket) => sum + ticket.price, 0)

    if (!connected) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-100 via-indigo-100 to-purple-100 flex items-center justify-center p-4">
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
        <div className="min-h-screen bg-gradient-to-b from-blue-100 via-indigo-100 to-purple-100">
            <div className="px-4 pt-6 pb-4">
                <div className="flex items-center justify-between mb-6">
                    <div className="text-gray-900 text-xl font-bold">Etcha</div>
                    <div className="flex items-center gap-3">
                        <button className="text-gray-600 hover:text-gray-900">
                            <Search className="w-5 h-5" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                            <Eye className="w-5 h-5" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                            <Settings className="w-5 h-5" />
                        </button>
                        <WalletDrawer>
                            <button className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </WalletDrawer>
                    </div>
                </div>

                <div className="flex flex-col items-start mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 mb-4 flex items-center justify-center overflow-hidden">
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
                        <h1 className="text-gray-900 text-2xl font-bold">{formatAddress(publicKey?.toString() || "")}</h1>
                        <button onClick={handleCopy} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                            <Copy className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                            <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                            <MoreHorizontal className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>

                    <div className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700 font-mono">
                        {formatAddress(publicKey?.toString() || "").toUpperCase()}
                    </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                            PORTFOLIO VALUE <Eye className="w-3 h-3" />
                        </div>
                        <div className="text-gray-900 font-bold">{totalValue.toFixed(2)} SOL</div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-xs mb-1">USD VALUE</div>
                        <div className="text-gray-900 font-bold">${(totalValue * 100).toFixed(2)}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-xs mb-1">NFTS</div>
                        <div className="text-gray-900 font-bold">{mockTickets.length}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-xs mb-1">TOKENS</div>
                        <div className="text-gray-900 font-bold">0</div>
                    </div>
                </div>

                <div className="flex items-center gap-6 border-b border-gray-200 mb-4">
                    <button
                        onClick={() => setActiveTab("galleries")}
                        className={`pb-3 text-sm font-medium transition-colors ${activeTab === "galleries" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Galleries
                    </button>
                    <button
                        onClick={() => setActiveTab("nfts")}
                        className={`pb-3 text-sm font-medium transition-colors ${activeTab === "nfts" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        NFTs
                    </button>
                    <button
                        onClick={() => setActiveTab("tokens")}
                        className={`pb-3 text-sm font-medium transition-colors ${activeTab === "tokens" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Tokens
                    </button>
                    <button
                        onClick={() => setActiveTab("listings")}
                        className={`pb-3 text-sm font-medium transition-colors ${activeTab === "listings" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Listings
                    </button>
                    <button
                        onClick={() => setActiveTab("offers")}
                        className={`pb-3 text-sm font-medium transition-colors ${activeTab === "offers" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Offers
                    </button>
                </div>

                <div className="flex items-center gap-3 mb-4">
                    <button className="p-2 bg-white/80 hover:bg-white rounded-lg transition-colors shadow-sm">
                        <Settings className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search for items"
                            className="w-full bg-white/80 border-gray-200 text-gray-900 placeholder:text-gray-400 pl-10 h-10 shadow-sm"
                        />
                    </div>
                    {/* <button className="p-2 bg-white/80 hover:bg-white rounded-lg transition-colors shadow-sm">
                        <Settings className="w-5 h-5 text-gray-600" />
                    </button> */}
                    <button className="p-2 bg-white/80 hover:bg-white rounded-lg transition-colors shadow-sm">
                        <Grid3x3 className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
{/* 
                <div className="text-gray-600 text-sm mb-4">
                    <input type="checkbox" className="mr-2 align-middle" />
                    {mockTickets.length} ITEMS
                </div> */}
            </div>

            <div className="px-4 pb-20">
                {mockTickets.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                        {mockTickets.map((ticket) => (
                            <div
                                key={ticket.id}
                                className="bg-white/80 rounded-xl overflow-hidden border border-gray-200 hover:border-gray-300 transition-colors shadow-sm"
                            >
                                <div className="aspect-square bg-gray-50 relative">
                                    <Image
                                        src={ticket.eventImage || "/placeholder.svg"}
                                        alt={ticket.eventTitle}
                                        width={200}
                                        height={200}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="p-3">
                                    <div className="text-gray-900 text-sm font-medium mb-1 line-clamp-1">{ticket.eventTitle}</div>
                                    <div className="text-gray-600 text-xs">{ticket.price} SOL</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="mb-6 relative">
                            <Image
                                src="/placeholder.svg?height=200&width=300"
                                alt="NFTs coming soon"
                                width={300}
                                height={200}
                                className="w-64 h-48 object-contain"
                            />
                        </div>
                        <h3 className="text-gray-900 text-xl font-bold mb-2">Solana NFTs coming soon</h3>
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 p-4">
                <div className="flex items-center gap-3">
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">List items</Button>
                    <Button variant="outline" className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white">
                        Accept offers
                    </Button>
                    <button className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <MoreHorizontal className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>
        </div>
    )
}
