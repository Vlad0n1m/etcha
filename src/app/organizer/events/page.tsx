"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
    Calendar,
    MapPin,
    Users,
    Ticket,
    QrCode,
    Plus,
    Loader2,
    AlertCircle,
    ChevronRight,
    Clock,
    CheckCircle2,
    BarChart3,
    Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface OrganizerEvent {
    id: string
    title: string
    date: string
    time: string
    fullAddress: string
    imageUrl: string
    ticketsAvailable: number
    ticketsSold: number
    price: number
    isActive: boolean
    attendanceCount: number
    hasPOAP: boolean
}

export default function OrganizerEventsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [events, setEvents] = useState<OrganizerEvent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (status === "loading") return

        if (!session?.user) {
            router.push("/auth/login")
            return
        }

        if (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN") {
            router.push("/dashboard")
            return
        }

        if (session.user.role === "ORGANIZER" && session.user.organizerStatus !== "APPROVED") {
            router.push("/dashboard/organizer/pending")
            return
        }

        fetchEvents()
    }, [session, status, router])

    const fetchEvents = async () => {
        try {
            setIsLoading(true)
            const response = await fetch("/api/organizer/events")
            const data = await response.json()

            if (data.success) {
                setEvents(data.events)
            } else {
                setError(data.message || "Failed to load events")
            }
        } catch (err) {
            console.error("Error fetching events:", err)
            setError("Failed to load events")
        } finally {
            setIsLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
        })
    }

    const isPastEvent = (dateString: string) => {
        return new Date(dateString) < new Date()
    }

    if (status === "loading" || isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-foreground mb-2">Error</h2>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={fetchEvents}>Try Again</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-background border-b border-border">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-foreground">My Events</h1>
                            <p className="text-sm text-muted-foreground">
                                {events.length} event{events.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                        <Link href="/organizer/create-event">
                            <Button size="sm" className="gap-2">
                                <Plus className="w-4 h-4" />
                                New Event
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-4">
                {events.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h2 className="text-lg font-semibold text-foreground mb-2">
                            No events yet
                        </h2>
                        <p className="text-muted-foreground mb-6">
                            Create your first event to start selling tickets
                        </p>
                        <Link href="/organizer/create-event">
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Event
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {events.map((event) => {
                            const past = isPastEvent(event.date)
                            const soldPercentage = event.ticketsAvailable > 0
                                ? Math.round((event.ticketsSold / event.ticketsAvailable) * 100)
                                : 0
                            const attendancePercentage = event.ticketsSold > 0
                                ? Math.round((event.attendanceCount / event.ticketsSold) * 100)
                                : 0

                            return (
                                <div
                                    key={event.id}
                                    className="bg-surface rounded-2xl border border-border overflow-hidden"
                                >
                                    {/* Event Header */}
                                    <div className="flex gap-4 p-4">
                                        <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden">
                                            <Image
                                                src={event.imageUrl || "/placeholder.svg"}
                                                alt={event.title}
                                                fill
                                                className="object-cover"
                                            />
                                            {past && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <span className="text-white text-xs font-medium">Ended</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="font-semibold text-foreground truncate">
                                                    {event.title}
                                                </h3>
                                                {event.hasPOAP && (
                                                    <span className="shrink-0 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                                        POAP
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span>{formatDate(event.date)}</span>
                                                <Clock className="w-3.5 h-3.5 ml-1" />
                                                <span>{event.time}</span>
                                            </div>
                                            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                                                <MapPin className="w-3.5 h-3.5" />
                                                <span className="truncate">{event.fullAddress}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="px-4 pb-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Tickets Sold */}
                                            <div className="bg-muted/50 rounded-xl p-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Ticket className="w-4 h-4 text-blue-500" />
                                                    <span className="text-xs text-muted-foreground">Tickets</span>
                                                </div>
                                                <p className="text-lg font-bold text-foreground">
                                                    {event.ticketsSold}
                                                    <span className="text-sm font-normal text-muted-foreground">
                                                        /{event.ticketsAvailable}
                                                    </span>
                                                </p>
                                                <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 transition-all"
                                                        style={{ width: `${soldPercentage}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Attendance */}
                                            <div className="bg-muted/50 rounded-xl p-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Users className="w-4 h-4 text-green-500" />
                                                    <span className="text-xs text-muted-foreground">Attended</span>
                                                </div>
                                                <p className="text-lg font-bold text-foreground">
                                                    {event.attendanceCount}
                                                    <span className="text-sm font-normal text-muted-foreground">
                                                        /{event.ticketsSold}
                                                    </span>
                                                </p>
                                                <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-green-500 transition-all"
                                                        style={{ width: `${attendancePercentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="border-t border-border">
                                        <div className="grid grid-cols-3 divide-x divide-border">
                                            {/* Scanner */}
                                            <Link
                                                href={`/organizer/scanner/${event.id}`}
                                                className="flex flex-col items-center gap-1 py-3 hover:bg-muted/50 transition-colors"
                                            >
                                                <QrCode className="w-5 h-5 text-primary" />
                                                <span className="text-xs font-medium text-foreground">Scanner</span>
                                            </Link>

                                            {/* Stats */}
                                            <Link
                                                href={`/organizer/events/${event.id}/stats`}
                                                className="flex flex-col items-center gap-1 py-3 hover:bg-muted/50 transition-colors"
                                            >
                                                <BarChart3 className="w-5 h-5 text-muted-foreground" />
                                                <span className="text-xs font-medium text-foreground">Stats</span>
                                            </Link>

                                            {/* Settings */}
                                            <Link
                                                href={`/organizer/events/${event.id}/settings`}
                                                className="flex flex-col items-center gap-1 py-3 hover:bg-muted/50 transition-colors"
                                            >
                                                <Settings className="w-5 h-5 text-muted-foreground" />
                                                <span className="text-xs font-medium text-foreground">Settings</span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
