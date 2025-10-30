"use client"
import { useWallet } from "@solana/wallet-adapter-react"
import { useState, useEffect } from "react"
import { Copy, Edit, Eye, TrendingUp, TrendingDown, MoreHorizontal, Wallet, RefreshCw } from "lucide-react"
import WalletDrawer from "@/components/WalletDrawer"
import MobileHeader from "@/components/MobileHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import Link from "next/link"

type TicketStatus = "bought" | "on_resale" | "passed" | "nft"

interface Ticket {
    id: string
    nftId: string
    eventTitle: string
    eventImage: string
    date: string
    time: string
    location: string
    price: number
    originalPrice: number
    marketPrice: number
    status: TicketStatus
}

export default function ProfilePage() {
    const { connected, publicKey, signMessage } = useWallet()
    const [activeTab, setActiveTab] = useState("bought")
    const [copied, setCopied] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [nickname, setNickname] = useState("User")
    const [showValue, setShowValue] = useState(true)
    const [internalWalletBalance, setInternalWalletBalance] = useState<number | null>(null)
    const [internalWalletAddress, setInternalWalletAddress] = useState<string | null>(null)
    const [isLoadingBalance, setIsLoadingBalance] = useState(false)
    const [copiedInternalAddress, setCopiedInternalAddress] = useState(false)
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [isLoadingTickets, setIsLoadingTickets] = useState(false)
    const [savedSignature, setSavedSignature] = useState<string | null>(null) // Store signature to avoid repeated requests

    // Function to load balance - can be called manually or on mount
    const loadBalance = async (useSavedSignature = false) => {
        if (!connected || !publicKey) {
            setInternalWalletBalance(null)
            setInternalWalletAddress(null)
            return
        }

        try {
            setIsLoadingBalance(true)
            
            let signatureHex = savedSignature
            
            // Get signature only if not using saved one or if saved one doesn't exist
            if (!useSavedSignature || !signatureHex) {
                // Wait for signMessage to be available
                if (!signMessage) {
                    console.log('Waiting for signMessage to be available...')
                    setIsLoadingBalance(false)
                    return
                }
                
                // Get signature for deriving internal wallet (only once)
                const message = new TextEncoder().encode("etcha-mint-auth-v1")
                const signature = await signMessage(message)
                
                // Convert signature to hex and save it
                signatureHex = Array.from(signature)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                
                // Save signature for future use
                setSavedSignature(signatureHex)
            }
            
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
                setInternalWalletAddress(data.internalWalletAddress)
                console.log('Internal wallet loaded:', data.internalWalletAddress, 'Balance:', data.balance)
            } else {
                console.error('Failed to load balance:', data.message)
                setInternalWalletBalance(0)
                setInternalWalletAddress(null)
            }
        } catch (error: any) {
            console.error('Error loading balance:', error)
            // Don't clear on user rejection - just log
            if (error?.message?.includes('User rejected') || error?.message?.includes('cancelled')) {
                console.log('User rejected signature request')
                // Keep previous values or show message
            } else {
                setInternalWalletBalance(0)
                setInternalWalletAddress(null)
            }
        } finally {
            setIsLoadingBalance(false)
        }
    }

    // Load balance only once on mount (when wallet is connected and signMessage is available)
    useEffect(() => {
        if (connected && publicKey && signMessage && !savedSignature) {
            loadBalance(false) // Request signature on first load
        } else if (!connected || !publicKey) {
            setInternalWalletBalance(null)
            setInternalWalletAddress(null)
            setSavedSignature(null) // Clear signature when wallet disconnects
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connected, publicKey, signMessage]) // Wait for signMessage to be available

    // Load tickets - use saved signature if available
    useEffect(() => {
        const loadTickets = async () => {
            if (!connected || !publicKey) {
                setTickets([])
                return
            }

            // Use saved signature if available, otherwise wait for signMessage
            if (!savedSignature) {
                if (!signMessage) {
                    return // Wait for signMessage
                }
                // Signature will be saved by loadBalance, wait for it
                return
            }

            try {
                setIsLoadingTickets(true)
                
                // Use saved signature (no need to request again)
                const signatureHex = savedSignature
                
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
            if (document.visibilityState === 'visible' && connected && publicKey && savedSignature) {
                loadTickets()
            }
        }
        
        document.addEventListener('visibilitychange', handleVisibilityChange)
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [connected, publicKey, savedSignature]) // Depend on savedSignature instead of signMessage

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

    const handleEditNickname = () => {
        if (isEditing && nickname.trim()) {
            // Here you would update the nickname, for now just toggle
            setIsEditing(false)
        } else {
            setIsEditing(true)
        }
    }

    const ownedTickets = tickets.filter(ticket => ["bought", "on_resale", "nft"].includes(ticket.status))
    const totalValue = ownedTickets.reduce((sum, ticket) => sum + ticket.price, 0)
    const totalTickets = ownedTickets.length

    const filteredTickets = tickets.filter(ticket => {
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
        <div className="min-h-screen bg-[linear-gradient(to_bottom,theme(colors.purple.500)_0%,theme(colors.purple.300)_10%,theme(colors.purple.100)_20%,theme(colors.slate.50)_100%)]">
            <MobileHeader />
            <div className="px-3 pt-24 pb-3">
                <div className="flex flex-col items-start mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 mb-3 flex items-center justify-center overflow-hidden">
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
                                className={`w-full text-white text-xs py-1.5 h-auto ${
                                    copiedInternalAddress 
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
                                    onClick={() => loadBalance(true)} 
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
                    {isLoadingTickets ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="text-gray-500 text-sm">Loading tickets...</div>
                        </div>
                    ) : filteredTickets.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                            {filteredTickets.map((ticket) => {
                                const priceChange = ((ticket.marketPrice - ticket.originalPrice) / ticket.originalPrice * 100)
                                const isPositive = priceChange > 0
                                return (
                                    <Link
                                        key={ticket.id}
                                        href={`/profile/ticket/${ticket.id}`}
                                        className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-md transition-all duration-200 shadow-sm flex flex-col cursor-pointer"
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
                                                    <span className="text-gray-600 text-xs font-medium">{ticket.price.toFixed(4)} SOL</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {isPositive ? <TrendingUp className="w-3 h-3 text-green-600" /> : <TrendingDown className="w-3 h-3 text-red-600" />}
                                                    <span className={`text-xs font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>{priceChange.toFixed(1)}%</span>
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
