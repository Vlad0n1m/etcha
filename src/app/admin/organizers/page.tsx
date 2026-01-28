"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    ChevronLeft,
    Building2,
    CheckCircle,
    XCircle,
    Clock,
    Loader2,
    Mail,
    Globe,
    Phone,
    MapPin,
    RefreshCw,
} from "lucide-react"

interface Organizer {
    id: string
    companyName: string
    description: string | null
    email: string | null
    website: string | null
    phone: string | null
    address: string | null
    status: "PENDING" | "APPROVED" | "REJECTED"
    requestedAt: string
    approvedAt: string | null
    rejectionNote: string | null
    user: {
        id: string
        name: string | null
        email: string | null
    }
}

export default function AdminOrganizersPage() {
    const { data: session } = useSession()
    const router = useRouter()

    const [organizers, setOrganizers] = useState<Organizer[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING")
    const [error, setError] = useState("")

    useEffect(() => {
        if (session?.user?.role !== "ADMIN") {
            router.push("/dashboard")
            return
        }
        fetchOrganizers()
    }, [session, router])

    const fetchOrganizers = async () => {
        setIsLoading(true)
        try {
            const response = await fetch("/api/admin/organizers")
            const data = await response.json()
            if (data.success) {
                setOrganizers(data.organizers)
            }
        } catch (err) {
            console.error("Failed to fetch organizers:", err)
            setError("Failed to load organizers")
        } finally {
            setIsLoading(false)
        }
    }

    const handleAction = async (organizerId: string, action: "approve" | "reject", note?: string) => {
        setActionLoading(organizerId)
        try {
            const response = await fetch(`/api/admin/organizers/${organizerId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, rejectionNote: note }),
            })

            const data = await response.json()
            if (data.success) {
                // Update local state
                setOrganizers((prev) =>
                    prev.map((org) =>
                        org.id === organizerId
                            ? {
                                ...org,
                                status: action === "approve" ? "APPROVED" : "REJECTED",
                                approvedAt: action === "approve" ? new Date().toISOString() : null,
                                rejectionNote: note || null,
                            }
                            : org
                    )
                )
            } else {
                setError(data.error || "Action failed")
            }
        } catch (err) {
            console.error("Action error:", err)
            setError("Failed to perform action")
        } finally {
            setActionLoading(null)
        }
    }

    const filteredOrganizers = organizers.filter((org) =>
        filter === "ALL" ? true : org.status === filter
    )

    const statusBadge = {
        PENDING: { color: "bg-yellow-100 text-yellow-700", icon: Clock },
        APPROVED: { color: "bg-green-100 text-green-700", icon: CheckCircle },
        REJECTED: { color: "bg-red-100 text-red-700", icon: XCircle },
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-8">
            {/* Header */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link
                        href="/admin"
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span className="text-sm font-medium">Admin Panel</span>
                    </Link>
                    <button
                        onClick={fetchOrganizers}
                        disabled={isLoading}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Title */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Organizer Requests</h1>
                        <p className="text-sm text-gray-500">
                            Review and manage organizer applications
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === status
                                ? "bg-primary text-primary-foreground"
                                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                                }`}
                        >
                            {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
                            {status !== "ALL" && (
                                <span className="ml-1 opacity-70">
                                    ({organizers.filter((o) => o.status === status).length})
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                        {error}
                    </div>
                )}

                {/* Loading */}
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                )}

                {/* Organizers List */}
                {!isLoading && filteredOrganizers.length === 0 && (
                    <div className="text-center py-12">
                        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No organizer requests found</p>
                    </div>
                )}

                {!isLoading && filteredOrganizers.length > 0 && (
                    <div className="space-y-4">
                        {filteredOrganizers.map((org) => {
                            const StatusIcon = statusBadge[org.status].icon
                            return (
                                <div
                                    key={org.id}
                                    className="bg-white rounded-xl border border-gray-100 overflow-hidden"
                                >
                                    <div className="p-4">
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                                    <Building2 className="w-6 h-6 text-purple-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">
                                                        {org.companyName}
                                                    </h3>
                                                    <p className="text-sm text-gray-500">
                                                        by {org.user.name || org.user.email}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${statusBadge[org.status].color}`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {org.status}
                                            </span>
                                        </div>

                                        {/* Description */}
                                        {org.description && (
                                            <p className="text-sm text-gray-600 mb-3">{org.description}</p>
                                        )}

                                        {/* Details */}
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            {org.email && (
                                                <div className="flex items-center gap-2 text-gray-500">
                                                    <Mail className="w-4 h-4" />
                                                    {org.email}
                                                </div>
                                            )}
                                            {org.website && (
                                                <div className="flex items-center gap-2 text-gray-500">
                                                    <Globe className="w-4 h-4" />
                                                    <a href={org.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                        {org.website}
                                                    </a>
                                                </div>
                                            )}
                                            {org.phone && (
                                                <div className="flex items-center gap-2 text-gray-500">
                                                    <Phone className="w-4 h-4" />
                                                    {org.phone}
                                                </div>
                                            )}
                                            {org.address && (
                                                <div className="flex items-center gap-2 text-gray-500">
                                                    <MapPin className="w-4 h-4" />
                                                    {org.address}
                                                </div>
                                            )}
                                        </div>

                                        {/* Rejection Note */}
                                        {org.status === "REJECTED" && org.rejectionNote && (
                                            <div className="mt-3 p-2 bg-red-50 rounded-lg">
                                                <p className="text-xs text-red-600">
                                                    <strong>Rejection reason:</strong> {org.rejectionNote}
                                                </p>
                                            </div>
                                        )}

                                        {/* Request Date */}
                                        <p className="text-xs text-gray-400 mt-3">
                                            Requested: {new Date(org.requestedAt).toLocaleDateString()}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    {org.status === "PENDING" && (
                                        <div className="border-t border-gray-100 p-4 flex gap-2">
                                            <button
                                                onClick={() => handleAction(org.id, "approve")}
                                                disabled={actionLoading === org.id}
                                                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-medium py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                            >
                                                {actionLoading === org.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle className="w-4 h-4" />
                                                )}
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const note = prompt("Rejection reason (optional):")
                                                    handleAction(org.id, "reject", note || undefined)
                                                }}
                                                disabled={actionLoading === org.id}
                                                className="flex-1 flex items-center justify-center gap-2 bg-white text-red-600 font-medium py-2 rounded-lg border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
