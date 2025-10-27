"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { useState, useEffect, useCallback } from "react"
import { Copy, Edit, Eye, MoreHorizontal, Save, X } from "lucide-react"
import WalletDrawer from "@/components/WalletDrawer"
import MobileHeader from "@/components/MobileHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import Link from 'next/link'
import { useAuth } from "@/components/AuthProvider"
import ListingModal from "@/components/ListingModal"

export default function ProfilePage() {
    const { connected, publicKey } = useWallet()
    const { token, isLoading: authLoading, error: authError, refreshToken } = useAuth()
    const [activeTab, setActiveTab] = useState("bought")
    const [copied, setCopied] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [nickname, setNickname] = useState("")
    const [tempNickname, setTempNickname] = useState("")
    const [showValue, setShowValue] = useState(true)
    const [tickets, setTickets] = useState<Array<{
        nftAddress: string
        name: string
        symbol: string
        collection?: string
        uri?: string
        image?: string | null
        solscanUrl?: string
    }>>([])
    const [, setProfile] = useState<{
        nickname?: string
    } | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingTickets, setIsLoadingTickets] = useState(false)
    const [error, setError] = useState("")
    const [isListingModalOpen, setIsListingModalOpen] = useState(false)

    const fetchProfile = useCallback(async () => {
        if (!token) return

        try {
            // Get profile using cached token
            const profileResponse = await fetch('/api/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (profileResponse.ok) {
                const profileData = await profileResponse.json()
                setProfile(profileData)
                setNickname(profileData.profile?.nickname || "User")
            } else if (profileResponse.status === 401) {
                // Token expired, refresh it
                await refreshToken()
            }
        } catch (err) {
            console.error('Error fetching profile:', err)
        }
    }, [token, refreshToken])

    const fetchTickets = useCallback(async () => {
        if (!publicKey) return

        setIsLoadingTickets(true)
        try {
            console.log('🎫 Fetching NFTs from blockchain...')

            // Fetch NFTs directly from the blockchain using user's wallet address
            const ticketsResponse = await fetch(`/api/solana/tickets/user/${publicKey.toString()}`)

            if (ticketsResponse.ok) {
                const response = await ticketsResponse.json()
                if (response.success && response.data) {
                    console.log(`✅ Found ${response.data.tickets.length} NFTs in wallet`)
                    setTickets(response.data.tickets)
                } else {
                    console.error('Failed to fetch NFTs:', response.error)
                    setTickets([])
                }
            } else {
                console.error('Failed to fetch NFTs:', ticketsResponse.status)
                setTickets([])
            }
        } catch (err) {
            console.error('Error fetching NFTs:', err)
            setTickets([])
        } finally {
            setIsLoadingTickets(false)
        }
    }, [publicKey])

    useEffect(() => {
        if (connected && publicKey) {
            fetchTickets()
            if (token) {
                fetchProfile()
            }
        }
    }, [connected, publicKey, token, fetchProfile, fetchTickets])

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
        if (isEditing && tempNickname.trim()) {
            saveNickname()
        } else {
            setTempNickname(nickname)
            setIsEditing(true)
        }
    }

    const saveNickname = async () => {
        if (!tempNickname.trim()) {
            setError("Nickname cannot be empty")
            return
        }

        if (!token) {
            setError("Authentication required")
            return
        }

        setIsLoading(true)
        setError("")

        try {
            // Update profile using cached token
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    nickname: tempNickname
                })
            })

            if (response.ok) {
                const updatedProfile = await response.json()
                setProfile(updatedProfile)
                setNickname(updatedProfile.nickname)
                setIsEditing(false)
            } else if (response.status === 401) {
                // Token expired, refresh it and retry
                await refreshToken()
                setError("Please try again")
            } else {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to update nickname')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update nickname')
        } finally {
            setIsLoading(false)
        }
    }

    const cancelEdit = () => {
        setTempNickname(nickname)
        setIsEditing(false)
        setError("")
    }

    const ownedTickets = tickets
    const totalValue = 0 // Will be calculated from NFT metadata
    const totalTickets = ownedTickets.length

    const filteredTickets = tickets // All NFTs are shown for now

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

    if (authLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Authenticating...</h2>
                    <p className="text-gray-600">Please sign the transaction to continue</p>
                </div>
            </div>
        )
    }

    if (authError) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Authentication Error</h2>
                    <p className="text-gray-600 mb-8">{authError}</p>
                    <Button
                        onClick={refreshToken}
                        size="lg"
                        className="bg-blue-600 text-white hover:bg-blue-700 px-8"
                    >
                        Try Again
                    </Button>
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
                            <div className="flex items-center gap-2">
                                <Input
                                    value={tempNickname}
                                    onChange={(e) => setTempNickname(e.target.value)}
                                    onBlur={saveNickname}
                                    onKeyDown={(e) => e.key === "Enter" && saveNickname()}
                                    className="text-lg font-bold text-gray-900 max-w-48"
                                    autoFocus
                                    placeholder="Enter nickname"
                                />
                                <Button
                                    size="sm"
                                    onClick={saveNickname}
                                    disabled={isLoading}
                                    className="px-2 py-1"
                                >
                                    {isLoading ? 'Saving...' : <Save className="w-4 h-4" />}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={cancelEdit}
                                    className="px-2 py-1"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-gray-900 text-xl font-bold">{nickname}</h1>
                                <button onClick={handleEditNickname} className="p-1 hover:bg-gray-100 rounded transition-colors">
                                    <Edit className="w-4 h-4 text-gray-500" />
                                </button>
                            </>
                        )}
                        <button onClick={handleCopy} className="p-1 hover:bg-gray-100 rounded transition-colors" title={copied ? "Copied!" : "Copy address"}>
                            <Copy className={`w-4 h-4 ${copied ? "text-green-500" : "text-gray-500"}`} />
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

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
                        <div className="text-gray-900 font-bold">{ownedTickets.length}</div>
                    </div>
                </div>

                <div className="flex items-center gap-4 border-b border-gray-200 mb-3">
                    {["bought", "used"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-2 text-sm font-medium transition-colors ${activeTab === tab ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="pb-20">
                    {isLoadingTickets ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                            <h3 className="text-gray-900 text-xl font-bold mb-2">Loading your tickets...</h3>
                            <p className="text-gray-600 text-sm text-center px-4">Fetching NFTs from the blockchain</p>
                        </div>
                    ) : filteredTickets.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                            {filteredTickets.map((ticket) => (
                                <div key={ticket.nftAddress} className="block">
                                    <Link
                                        href={`/ticket/${ticket.nftAddress}`}
                                        className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-md transition-all duration-200 shadow-sm flex flex-col"
                                    >
                                        <div className="aspect-square bg-gray-50 relative shrink-0">
                                            {ticket.image ? (
                                                <Image
                                                    src={ticket.image}
                                                    alt={ticket.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-2xl">
                                                    {ticket.symbol || 'NFT'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 flex flex-col p-3 justify-between">
                                            <div className="mb-auto">
                                                <div className="text-gray-900 text-sm font-semibold line-clamp-2">{ticket.name}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-600 text-xs font-mono">
                                                        {ticket.nftAddress.slice(0, 4)}...{ticket.nftAddress.slice(-4)}
                                                    </span>
                                                    <span className="text-blue-600 text-xs font-medium">View Ticket →</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-600">
                                                        Owned
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            ))}
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
                            <h3 className="text-gray-900 text-xl font-bold mb-2">No NFT tickets found</h3>
                            <p className="text-gray-600 mb-4 text-sm text-center px-4">Purchase event tickets to see them here as NFTs in your wallet</p>
                            <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
                                Browse Events
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 p-3">
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setIsListingModalOpen(true)}
                        disabled={tickets.length === 0}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                    >
                        List items
                    </Button>
                    <Button variant="outline" className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white text-sm">
                        Accept offers
                    </Button>
                    <button className="p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Listing Modal */}
            <ListingModal
                isOpen={isListingModalOpen}
                onClose={() => setIsListingModalOpen(false)}
                tickets={tickets}
                onListingCreated={() => {
                    fetchTickets();
                }}
            />
        </div>
    )
}
