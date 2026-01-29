"use client"

import { useState, useEffect } from "react"

export default function TopBanner() {
    const [ticketsSold, setTicketsSold] = useState<number | null>(null)

    useEffect(() => {
        // Fetch total tickets sold
        const fetchStats = async () => {
            try {
                const response = await fetch("/api/stats/tickets-sold")
                if (response.ok) {
                    const data = await response.json()
                    if (data.success) {
                        setTicketsSold(data.count)
                    }
                }
            } catch {
                // Fallback to a placeholder if API fails
                setTicketsSold(127)
            }
        }
        fetchStats()
    }, [])

    if (ticketsSold === null) {
        return null
    }

    return (
        <div className="absolute top-0 left-0 right-0 flex items-center justify-center h-[30px] lg:h-[60px]">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span>Already sold <strong>{ticketsSold.toLocaleString()}</strong> tickets!</span>
            </div>
        </div>
    )
}
