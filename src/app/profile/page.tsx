"use client"

import { useSession } from "next-auth/react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useState, useEffect } from "react"
import { Copy, Edit, Eye, MoreHorizontal, Wallet, RefreshCw, Save, X, User, LogIn, UserPlus } from "lucide-react"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import WalletDrawer from "@/components/WalletDrawer"
import MobileHeader from "@/components/MobileHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import Link from "next/link"
import EventCard from "@/components/EventCard"

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

// Auth prompt component for non-authenticated users
function AuthPrompt() {
    return (
        <div className="min-h-screen bg-gray-50">
            <MobileHeader />
            <div className="flex items-center justify-center min-h-screen px-4 pt-16 pb-20">
                <div className="w-full max-w-md text-center">
                    {/* Icon */}
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <User className="w-10 h-10 text-purple-600" />
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">
                        Sign in to your account
                    </h1>
                    <p className="text-gray-500 mb-8">
                        Create an account or sign in to view your profile, tickets, and more.
                    </p>

                    {/* Auth buttons */}
                    <div className="space-y-3">
                        <Link
                            href="/auth/login"
                            className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors"
                        >
                            <LogIn className="w-5 h-5" />
                            Sign In
                        </Link>
                        <Link
                            href="/auth/register"
                            className="flex items-center justify-center gap-2 w-full bg-white text-gray-900 font-semibold py-3 px-6 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
                        >
                            <UserPlus className="w-5 h-5" />
                            Create Account
                        </Link>
                    </div>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-gray-50 text-gray-500">or</span>
                        </div>
                    </div>

                    {/* Browse events */}
                    <Link
                        href="/"
                        className="text-purple-600 font-medium hover:text-purple-700 transition-colors"
                    >
                        Browse events without an account
                    </Link>
                </div>
            </div>
        </div>
    )
}

// Loading component
function LoadingState() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading profile...</p>
            </div>
        </div>
    )
}

export default function ProfilePage() {
    const { data: session, status } = useSession()
    const { connected, publicKey } = useWallet()
    const { connection } = useConnection()

    const [activeTab, setActiveTab] = useState("bought")
    const [copied, setCopied] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [nickname, setNickname] = useState("")
    const [tempNickname, setTempNickname] = useState("")
    const [showValue, setShowValue] = useState(true)
    const [walletBalance, setWalletBalance] = useState<number | null>(null)
    const [isLoadingBalance, setIsLoadingBalance] = useState(false)
    const [isSavingNickname, setIsSavingNickname] = useState(false)
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [isLoadingTickets, setIsLoadingTickets] = useState(false)

    // Set nickname from session
    useEffect(() => {
        if (session?.user?.name) {
            setNickname(session.user.name)
            setTempNickname(session.user.name)
        } else if (session?.user?.email) {
            const emailName = session.user.email.split("@")[0]
            setNickname(emailName)
            setTempNickname(emailName)
        }
    }, [session])

    // Wallet address from connected wallet
    const walletAddress = publicKey?.toBase58()

    // Load wallet balance directly from chain
    const loadBalance = async () => {
        if (!publicKey || !connection) {
            setWalletBalance(null)
            return
        }

        try {
            setIsLoadingBalance(true)
            const balance = await connection.getBalance(publicKey)
            setWalletBalance(balance / LAMPORTS_PER_SOL)
        } catch (error) {
            console.error('Error loading balance:', error)
            setWalletBalance(null)
        } finally {
            setIsLoadingBalance(false)
        }
    }

    // Load balance when wallet connects
    useEffect(() => {
        if (connected && publicKey) {
            loadBalance()
        } else {
            setWalletBalance(null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connected, publicKey])

    // Load tickets (using wallet address)
    useEffect(() => {
        const loadTickets = async () => {
            if (!walletAddress) {
                setTickets([])
                return
            }

            try {
                setIsLoadingTickets(true)

                const response = await fetch(`/api/profile/tickets?wallet=${walletAddress}`)

                if (!response.ok) {
                    console.error('Failed to fetch tickets:', response.status)
                    setTickets([])
                    return
                }

                const text = await response.text()
                if (!text) {
                    setTickets([])
                    return
                }

                const data = JSON.parse(text)

                if (data.success) {
                    setTickets(data.tickets || [])
                } else {
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
    }, [walletAddress])

    const formatAddress = (address: string) => {
        return `${address.slice(0, 4)}...${address.slice(-4)}`
    }

    const handleCopy = () => {
        if (walletAddress) {
            navigator.clipboard.writeText(walletAddress)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const saveNickname = async () => {
        if (!tempNickname.trim()) {
            setIsEditing(false)
            return
        }

        setIsSavingNickname(true)
        try {
            setNickname(tempNickname.trim())
            setIsEditing(false)
        } finally {
            setIsSavingNickname(false)
        }
    }

    const cancelEdit = () => {
        setTempNickname(nickname)
        setIsEditing(false)
    }

    const ownedTickets = tickets.filter(ticket => ["bought", "on_resale", "nft"].includes(ticket.status))
    const totalTickets = ownedTickets.length

    const filteredTickets = tickets.filter(ticket => {
        if (activeTab === "bought") return ticket.status === "bought"
        if (activeTab === "used") return ticket.status === "passed"
        return true
    })

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

    // Show loading state
    if (status === "loading") {
        return <LoadingState />
    }

    // Show auth prompt if not logged in
    if (!session?.user) {
        return <AuthPrompt />
    }

    // User is authenticated - show profile
    return (
        <div className="min-h-screen bg-background">
            <MobileHeader />
            <div className="px-3 pt-24 pb-3 md:pt-8 md:max-w-4xl md:mx-auto">
                <div className="flex flex-col items-start mb-4">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-full mb-3 flex items-center justify-center overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600">
                        {session.user.image ? (
                            <Image
                                src={session.user.image}
                                alt="Profile"
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-white text-2xl font-bold">
                                {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || "U"}
                            </span>
                        )}
                    </div>

                    {/* Name and email */}
                    <div className="flex items-center gap-2 mb-1">
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
                                <h1 className="text-gray-900 text-xl font-bold">{nickname || "User"}</h1>
                                <button
                                    onClick={() => {
                                        setTempNickname(nickname)
                                        setIsEditing(true)
                                    }}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                >
                                    <Edit className="w-4 h-4 text-gray-500" />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Email */}
                    <p className="text-sm text-gray-500 mb-3">{session.user.email}</p>

                    {/* Wallet section */}
                    {connected && walletAddress ? (
                        <div className="w-full mb-3 p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-gray-600 text-xs font-medium">Connected Wallet</span>
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                    title={copied ? "Copied!" : "Copy address"}
                                >
                                    <Copy className={`w-3.5 h-3.5 ${copied ? "text-green-500" : "text-gray-500"}`} />
                                </button>
                            </div>
                            <div className="px-2 py-1.5 bg-gray-50 rounded text-xs text-gray-700 font-mono mb-2">
                                {formatAddress(walletAddress).toUpperCase()}
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 text-sm">
                                    <span className="text-gray-500">Balance:</span>
                                    {isLoadingBalance ? (
                                        <span className="text-gray-400">Loading...</span>
                                    ) : (
                                        <span className="font-semibold text-gray-900">
                                            {showValue ? (walletBalance !== null ? walletBalance.toFixed(4) : "0.0000") : "***"} SOL
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setShowValue(!showValue)}
                                        className="p-1 hover:bg-gray-100 rounded"
                                        title={showValue ? "Hide balance" : "Show balance"}
                                    >
                                        <Eye className="w-3.5 h-3.5 text-gray-500" />
                                    </button>
                                    <button
                                        onClick={loadBalance}
                                        disabled={isLoadingBalance}
                                        className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                                        title="Refresh balance"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${isLoadingBalance ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="flex items-center gap-3">
                                <Wallet className="w-5 h-5 text-purple-600" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-purple-900">Connect your Solana wallet</p>
                                    <p className="text-xs text-purple-600">Required to buy and manage tickets</p>
                                </div>
                                <WalletDrawer>
                                    <Button
                                        size="sm"
                                        className="bg-purple-600 hover:bg-purple-700 text-white"
                                    >
                                        Connect
                                    </Button>
                                </WalletDrawer>
                            </div>
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <div className="text-gray-500 text-xs mb-1">WALLET BALANCE</div>
                        <div className="text-gray-900 font-bold">
                            {!connected ? (
                                <span className="text-gray-400">—</span>
                            ) : isLoadingBalance ? (
                                <span className="text-sm text-gray-400">Loading...</span>
                            ) : (
                                <>{showValue ? (walletBalance !== null ? walletBalance.toFixed(4) : "0.0000") : "***"} SOL</>
                            )}
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

                {/* Tabs */}
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

                {/* Tickets */}
                <div className="pb-20 md:pb-8">
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
                            <Link href="/" className="text-purple-600 font-medium hover:underline">
                                Browse events
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom actions - only on mobile */}
            <div className="md:hidden fixed bottom-16 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 p-3">
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
