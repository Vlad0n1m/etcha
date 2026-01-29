import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { signOut } from "@/lib/auth"
import {
    User,
    Wallet,
    Building2,
    Calendar,
    Ticket,
    ChevronRight,
    LogOut,
    Shield,
    Clock,
    CheckCircle,
    XCircle,
} from "lucide-react"

export default async function DashboardPage() {
    const session = await auth()

    if (!session?.user) {
        redirect("/auth/login")
    }

    const { user } = session

    // Role badge colors
    const roleBadge = {
        USER: { color: "bg-gray-100 text-gray-700", label: "User" },
        ORGANIZER: { color: "bg-purple-100 text-purple-700", label: "Organizer" },
        ADMIN: { color: "bg-red-100 text-red-700", label: "Admin" },
    }

    // Organizer status badges
    const statusBadge = {
        PENDING: { color: "bg-yellow-100 text-yellow-700", icon: Clock, label: "Pending Approval" },
        APPROVED: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Approved" },
        REJECTED: { color: "bg-red-100 text-red-700", icon: XCircle, label: "Rejected" },
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
                    <form
                        action={async () => {
                            "use server"
                            await signOut({ redirectTo: "/" })
                        }}
                    >
                        <button
                            type="submit"
                            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign out
                        </button>
                    </form>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* Profile Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                            {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-bold text-gray-900">{user.name || "User"}</h2>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${roleBadge[user.role].color}`}>
                                    {roleBadge[user.role].label}
                                </span>
                                {user.role === "ORGANIZER" && user.organizerStatus && (
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 ${statusBadge[user.organizerStatus as keyof typeof statusBadge].color}`}>
                                        {statusBadge[user.organizerStatus as keyof typeof statusBadge].label}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Wallet Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-gray-400" />
                            Solana Wallet
                        </h3>
                    </div>
                    <div className="p-4">
                        {user.walletAddress ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Connected Wallet</span>
                                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                        {user.walletAddress.slice(0, 4)}...{user.walletAddress.slice(-4)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-green-600 text-sm">
                                    <CheckCircle className="w-4 h-4" />
                                    Wallet linked successfully
                                </div>
                            </div>
                        ) : (
                            <Link
                                href="/dashboard/wallet"
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                        <Wallet className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Link your wallet</p>
                                        <p className="text-xs text-gray-500">Connect Solana wallet to buy tickets</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </Link>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900">Quick Actions</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {/* Browse Events */}
                        <Link
                            href="/"
                            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">Browse Events</p>
                                    <p className="text-xs text-gray-500">Find and buy tickets</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                        </Link>

                        {/* My Tickets */}
                        <Link
                            href="/profile"
                            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                    <Ticket className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">My Tickets</p>
                                    <p className="text-xs text-gray-500">View your purchased tickets</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                        </Link>

                        {/* Become Organizer (only for USER role) */}
                        {user.role === "USER" && (
                            <Link
                                href="/dashboard/organizer/request"
                                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Become an Organizer</p>
                                        <p className="text-xs text-gray-500">Create and manage events</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </Link>
                        )}

                        {/* My Events (only for approved organizers) */}
                        {user.role === "ORGANIZER" && user.organizerStatus === "APPROVED" && (
                            <Link
                                href="/organizer/events"
                                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">My Events</p>
                                        <p className="text-xs text-gray-500">Manage events & scan tickets</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </Link>
                        )}

                        {/* Create Event (only for approved organizers) */}
                        {user.role === "ORGANIZER" && user.organizerStatus === "APPROVED" && (
                            <Link
                                href="/organizer/create-event"
                                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Create Event</p>
                                        <p className="text-xs text-gray-500">Set up a new event</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </Link>
                        )}

                        {/* All Events (for admins) */}
                        {user.role === "ADMIN" && (
                            <Link
                                href="/organizer/events"
                                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">All Events</p>
                                        <p className="text-xs text-gray-500">Manage all events & scan tickets</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </Link>
                        )}

                        {/* Admin Panel (only for admins) */}
                        {user.role === "ADMIN" && (
                            <Link
                                href="/admin"
                                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Admin Panel</p>
                                        <p className="text-xs text-gray-500">Manage platform</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
