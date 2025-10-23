"use client"

import React from 'react'
import MobileHeader from '@/components/MobileHeader'
import TicketCard from '@/components/TicketCard'

// Mock data for tickets
const mockTickets: Array<{
    id: string
    eventTitle: string
    eventDate: string
    eventTime: string
    ticketType: string
    price: number
    status: "purchased" | "attended"
    qrCode: string
    venue: string
    eventImage: string
    nftId: string
}> = [
        {
            id: '1',
            eventTitle: "Arcium's <encrypted> Side Track",
            eventDate: '2024-03-15',
            eventTime: '19:00',
            ticketType: 'General Admission',
            price: 20000,
            status: 'purchased',
            qrCode: 'QR123456789',
            venue: 'Tech Conference Center, San Francisco, CA',
            eventImage: '/banner1.png',
            nftId: 'NFT123456789'
        },
        {
            id: '2',
            eventTitle: 'Blockchain Security Workshop',
            eventDate: '2024-03-15',
            eventTime: '21:30',
            ticketType: 'VIP',
            price: 8000,
            status: 'purchased',
            qrCode: 'QR987654321',
            venue: 'Crypto Hub, New York, NY',
            eventImage: '/banner1.png',
            nftId: 'NFT987654321'
        },
        {
            id: '3',
            eventTitle: 'AI & Machine Learning Summit',
            eventDate: '2024-03-16',
            eventTime: '14:00',
            ticketType: 'Student',
            price: 12000,
            status: 'attended',
            qrCode: 'QR456789123',
            venue: 'AI Innovation Center, Silicon Valley, CA',
            eventImage: '/banner1.png',
            nftId: 'NFT456789123'
        }
    ]

export default function TicketsPage() {
    return (
        <>
            {/* Mobile Header */}
            <MobileHeader />

            {/* Content */}
            <div className="flex-1 overflow-y-auto main-content">
                <div className="py-4">
                    <div className="container mx-auto px-4">
                        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Tickets</h1>

                        {mockTickets.length > 0 ? (
                            <div className="space-y-4">
                                {mockTickets.map((ticket) => (
                                    <TicketCard
                                        key={ticket.id}
                                        id={ticket.id}
                                        eventTitle={ticket.eventTitle}
                                        eventImage={ticket.eventImage}
                                        date={ticket.eventDate}
                                        time={ticket.eventTime}
                                        location={ticket.venue}
                                        price={ticket.price}
                                        status={ticket.status}
                                        nftId={ticket.nftId}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets yet</h3>
                                <p className="text-gray-500">Your purchased tickets will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
