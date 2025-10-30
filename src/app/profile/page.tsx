"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { useState, useEffect } from "react"
import { Copy, Edit, Eye, MoreHorizontal, Wallet, RefreshCw, Save, X } from "lucide-react"
import WalletDrawer from "@/components/WalletDrawer"
import MobileHeader from "@/components/MobileHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
// Link not needed after redesign
import EventCard from "@/components/EventCard"
import { useAuth } from "@/components/AuthProvider"
import { useSignature } from "@/components/SignatureProvider"

type TicketStatus = "bought" | "on_resale" | "passed" | "nft"

interface Ticket {
    id: string
    nftId: string
    eventTitle: string
    eventImage: string
    description?: string
    date: string
    time: string
    location: string
    price: number
    originalPrice: number
    marketPrice: number
    status: TicketStatus
    organizerName?: string
}

export default function ProfilePage() {
    const { connected, publicKey } = useWallet()
    const { isLoading: authLoading, error: authError, refreshToken } = useAuth()
    const { signature, derivedAddress } = useSignature()
    const [activeTab, setActiveTab] = useState("bought")
    const [copied, setCopied] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [nickname, setNickname] = useState("User")
    const [tempNickname, setTempNickname] = useState("")
    const [showValue, setShowValue] = useState(true)
    const [internalWalletBalance, setInternalWalletBalance] = useState<number | null>(null)
    const [internalWalletAddress, setInternalWalletAddress] = useState<string | null>(null)
    const [isLoadingBalance, setIsLoadingBalance] = useState(false)
    const [isSavingNickname, setIsSavingNickname] = useState(false)
    const [copiedInternalAddress, setCopiedInternalAddress] = useState(false)
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [isLoadingTickets, setIsLoadingTickets] = useState(false)
    // Signature and derived address are provided by SignatureProvider

    // Function to load balance - can be called manually or on mount
    const loadBalance = async () => {
        if (!connected || !publicKey) {
            setInternalWalletBalance(null)
            setInternalWalletAddress(null)
            return
        }

        // Wait for signature to be available from SignatureProvider
        if (!signature) {
            console.log('⏳ Waiting for signature from SignatureProvider...')
            return
        }

        try {
            setIsLoadingBalance(true)

            const signatureHex = Array.from(signature)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')

            // POST request with signature to derive internal wallet
            const response = await fetch('/api/wallet/balance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    signature: signatureHex,
                }),
            })

            const data = await response.json()

            if (data.success) {
                setInternalWalletBalance(data.balance ?? 0)
                setInternalWalletAddress(derivedAddress || data.internalWalletAddress || null)
                console.log('Internal wallet loaded:', data.internalWalletAddress, 'Balance:', data.balance)
            } else {
                console.error('Failed to load balance:', data.message)
                setInternalWalletBalance(0)
                setInternalWalletAddress(null)
            }
        } catch (error: unknown) {
            console.error('Error loading balance:', error)
            setInternalWalletBalance(0)
            setInternalWalletAddress(null)
        } finally {
            setIsLoadingBalance(false)
        }
    }

    // Load balance once when wallet/signature ready
    useEffect(() => {
        if (connected && publicKey && signature) {
            loadBalance()
        } else if (!connected || !publicKey) {
            setInternalWalletBalance(null)
            setInternalWalletAddress(null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connected, publicKey, signature])

    // Load tickets - use shared signature
    useEffect(() => {
        const loadTickets = async () => {
            if (!connected || !publicKey) {
                setTickets([])
                return
            }

            // Wait for signature from SignatureProvider
            if (!signature) {
                console.log('⏳ Waiting for signature for tickets...')
                return
            }

            try {
                setIsLoadingTickets(true)

                const signatureHex = Array.from(signature)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')

                // POST request with signature to derive internal wallet
                const response = await fetch('/api/profile/tickets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        walletAddress: publicKey.toString(),
                        signature: signatureHex,
                    }),
                })

                const data = await response.json()

                if (data.success) {
                    setTickets(data.tickets || [])
                } else {
                    console.error('Failed to load tickets:', data.message)
                    setTickets([])
                }
            } catch (error) {
                console.error('Error loading tickets:', error)
                setTickets([])
            } finally {
                setIsLoadingTickets(false)
            }
        }

        loadTickets()

        // Also refresh tickets when page becomes visible (user returns from purchase)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && connected && publicKey) {
                loadTickets()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [connected, publicKey, signature])

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

    const handleCopyInternalAddress = () => {
        if (internalWalletAddress) {
            navigator.clipboard.writeText(internalWalletAddress)
            setCopiedInternalAddress(true)
            setTimeout(() => setCopiedInternalAddress(false), 2000)
        }
    }

    const handleTopUp = async () => {
        if (internalWalletAddress) {
            try {
                // Copy address to clipboard
                await navigator.clipboard.writeText(internalWalletAddress)
                setCopiedInternalAddress(true)

                // Show notification (optional - you could add a toast here)
                setTimeout(() => {
                    setCopiedInternalAddress(false)
                }, 3000)
            } catch (error) {
                console.error('Failed to copy address:', error)
            }
        }
    }

    const saveNickname = async () => {
        if (!tempNickname.trim()) {
            setIsEditing(false)
            return
        }

        setIsSavingNickname(true)
        try {
            // Here you would save the nickname to your backend
            // For now, just update the local state
            setNickname(tempNickname.trim())
            setIsEditing(false)
        } catch (error) {
            console.error('Error saving nickname:', error)
        } finally {
            setIsSavingNickname(false)
        }
    }

    const cancelEdit = () => {
        setTempNickname(nickname)
        setIsEditing(false)
    }

    const handleEditNickname = () => {
        if (isEditing && tempNickname.trim()) {
            saveNickname()
        } else {
            setTempNickname(nickname)
            setIsEditing(true)
        }
    }

    const ownedTickets = tickets.filter(ticket => ["bought", "on_resale", "nft"].includes(ticket.status))
    const totalTickets = ownedTickets.length

    const filteredTickets = tickets.filter(ticket => {
        if (activeTab === "bought") return ticket.status === "bought"
        if (activeTab === "used") return ticket.status === "passed"
        return true
    })

    // Group tickets by date similar to home page feed
    const groupTicketsByDate = (items: Ticket[]) => {
        const grouped = items.reduce((acc: Record<string, Ticket[]>, t: Ticket) => {
            const dateKey = t.date
            if (!acc[dateKey]) acc[dateKey] = []
            acc[dateKey].push(t)
            return acc
        }, {} as Record<string, Ticket[]>)
        return Object.keys(grouped)
            .sort()
            .map(date => ({
                date,
                items: grouped[date].sort((a: Ticket, b: Ticket) => (a.time || '').localeCompare(b.time || ''))
            }))
    }

    const formatDateHeader = (dateString: string) => {
        const date = new Date(dateString)
        const today = new Date()
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        if (date.toDateString() === today.toDateString()) return 'Today'
        if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
        return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
    }

    const groupedTickets = groupTicketsByDate(filteredTickets)

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
                                    disabled={isSavingNickname}
                                    className="px-2 py-1"
                                >
                                    {isSavingNickname ? 'Saving...' : <Save className="w-4 h-4" />}
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

                    <div className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700 font-mono mb-2">
                        {formatAddress(publicKey?.toString() || "").toUpperCase()}
                    </div>

                    {/* Internal Wallet Section */}
                    {internalWalletAddress && (
                        <div className="w-full mb-3 p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Wallet className="w-4 h-4 text-gray-600" />
                                    <span className="text-gray-600 text-xs font-medium">Internal Wallet</span>
                                </div>
                                <button
                                    onClick={handleCopyInternalAddress}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                    title={copiedInternalAddress ? "Copied!" : "Copy internal wallet address"}
                                >
                                    <Copy className={`w-3.5 h-3.5 ${copiedInternalAddress ? "text-green-500" : "text-gray-500"}`} />
                                </button>
                            </div>
                            <div className="px-2 py-1.5 bg-gray-50 rounded text-xs text-gray-700 font-mono mb-2 break-all">
                                {internalWalletAddress}
                            </div>
                            <Button
                                onClick={handleTopUp}
                                className={`w-full text-white text-xs py-1.5 h-auto ${copiedInternalAddress
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-blue-600 hover:bg-blue-700"
                                    }`}
                                size="sm"
                                disabled={copiedInternalAddress}
                            >
                                <Wallet className="w-3 h-3 mr-1.5" />
                                {copiedInternalAddress ? "✓ Address Copied!" : "Top Up Wallet"}
                            </Button>
                            {copiedInternalAddress && (
                                <p className="text-xs text-gray-600 mt-1 text-center">
                                    Send SOL to this address from your external wallet
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between mb-3">
                    <div>
                        <div className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                            INTERNAL WALLET BALANCE
                            <button
                                onClick={() => setShowValue(!showValue)}
                                className="p-0.5 hover:bg-gray-100 rounded"
                                title={showValue ? "Hide balance" : "Show balance"}
                            >
                                <Eye className="w-3 h-3" />
                            </button>
                            {internalWalletAddress && (
                                <button
                                    onClick={() => loadBalance()}
                                    disabled={isLoadingBalance}
                                    className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Refresh balance"
                                >
                                    <RefreshCw className={`w-3 h-3 ${isLoadingBalance ? 'animate-spin' : ''}`} />
                                </button>
                            )}
                        </div>
                        <div className="text-gray-900 font-bold">
                            {isLoadingBalance ? (
                                <span className="text-sm">Loading...</span>
                            ) : (
                                showValue ? (internalWalletBalance !== null ? internalWalletBalance.toFixed(4) : "0.0000") : "***"
                            )} SOL
                        </div>
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
                            <div className="text-gray-500 text-sm">Loading tickets...</div>
                        </div>
                    ) : groupedTickets.length > 0 ? (
                        <div className="space-y-3">
                            {groupedTickets.map(group => (
                                <div key={group.date} className="mb-4">
                                    <div className="flex items-center mb-2">
                                        <div className="w-3 h-3 bg-gray-400 rounded-full mr-4 translate-x-[-6px]"></div>
                                        <h2 className="text-xl font-bold text-gray-900">{formatDateHeader(group.date)}</h2>
                                    </div>
                                    <div className="space-y-3 pl-4 border-l border-gray-300 border-dashed">
                                        {group.items.map(ticket => (
                                            <div key={ticket.id} className="relative">
                                                <EventCard
                                                    id={ticket.id}
                                                    title={ticket.eventTitle}
                                                    company=""
                                                    price={ticket.price}
                                                    date={ticket.date}
                                                    time={ticket.time}
                                                    ticketsAvailable={0}
                                                    imageUrl={ticket.eventImage}
                                                    category=""
                                                    organizer={null}
                                                    href={`/profile/ticket/${ticket.id}`}
                                                    size="lg"
                                                    description={ticket.description}
                                                    badge={(ticket.status === 'on_resale') ? 'on resale' : (ticket.status === 'bought' || ticket.status === 'nft') ? 'owned' : undefined}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="mb-4 relative">
                                <Image
                                    src="/no-ticket-svgrepo-com.svg?height=200&width=300"
                                    alt="No tickets"
                                    width={300}
                                    height={200}
                                    className="w-64 h-48 object-contain opacity-50"
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
