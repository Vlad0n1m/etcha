"use client"

import React, { useState, useMemo, useCallback } from 'react'
import EventCard from '@/components/EventCard'
import BannerCarousel from '@/components/BannerCarousel'
import EventFilters from '@/components/EventFilters'
import MobileHeader from '@/components/MobileHeader'

interface Event {
  id: string
  title: string
  price: number
  date: string
  time: string
  ticketsAvailable: number
  imageUrl: string
  category: string
  organizer?: {
    name: string
    avatar?: string
  } | null
}


export default function Home() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [error, setError] = useState('')

  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const query = activeFilter !== 'all' ? `?category=${encodeURIComponent(activeFilter)}` : ''
      const response = await fetch(`/api/events${query}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch events')
      }

      const eventsData = await response.json()
      setEvents(eventsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
    } finally {
      setIsLoading(false)
    }
  }, [activeFilter])

  // Fetch events on component mount and when filter changes
  React.useEffect(() => {
    fetchEvents()
  }, [fetchEvents])


  // Group events by date
  const groupEventsByDate = (events: Event[]) => {
    const grouped = events.reduce((acc: Record<string, Event[]>, event: Event) => {
      const date = event.date
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(event)
      return acc
    }, {} as Record<string, Event[]>)

    // Sort dates and events within each date by time
    return Object.keys(grouped)
      .sort()
      .map(date => ({
        date,
        events: grouped[date].sort((a: Event, b: Event) => a.time.localeCompare(b.time))
      }))
  }

  // Format date for display
  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })
    }
  }

  // Banner data
  const bannerData = [
    {
      id: '1',
      title: 'Host with Confidence',
      description: 'Launch your event in minutes. Sell verified NFT tickets, earn from resales, and reach real fans—powered by Solana.',
      buttonText: 'Get Started',
      backgroundImage: '/banner1.png',
      buttonLink: '/organizer/create-event'
    },
    {
      id: '2',
      title: 'Join the Real Event',
      description: 'Buy authentic tickets safely and instantly. No scams, no fakes—your access is on-chain and truly yours.',
      backgroundImage: '/banner1.png',
      buttonText: 'Explore Events',
      buttonLink: '/'
    },
    {
      id: '3',
      title: 'Resell Smarter',
      description: 'Can’t attend? List your ticket in one click and get paid instantly on Solana—with low fees and full transparency.',
      buttonText: 'Start Reselling',
      backgroundImage: '/banner1.png',
      buttonLink: '/resale'
    },
  ]

  // Use server-filtered results directly
  const groupedEvents = groupEventsByDate(events)

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
    // Simulate loading when filter changes
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }

  return (
    <>
      {/* Mobile Header */}
      <MobileHeader />

      {/* Banner Carousel */}
      <div className="w-full pt-20">
        <BannerCarousel banners={bannerData} />
      </div>

      <div className="py-4 flex-1 pb-16">
        <div className="container mx-auto">
          {/* Event Filters */}
          <EventFilters
            onFilterChange={handleFilterChange}
            activeFilter={activeFilter}
          />

          {/* Events List */}
          <div className="px-4 pb-4">
            {isLoading ? (
              // Show skeletons during loading
              <div className="space-y-3">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="relative">
                    <EventCard
                      id=""
                      title=""
                      company=""
                      price={0}
                      date=""
                      ticketsAvailable={0}
                      imageUrl=""
                      category=""
                      isLoading={true}
                    />
                  </div>
                ))}
              </div>
            ) : groupedEvents.length > 0 ? (
              groupedEvents.map((group) => (
                <div key={group.date} className="mb-4">
                  {/* Date Header */}
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full mr-4 translate-x-[-6px]"></div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {formatDateHeader(group.date)}
                    </h2>
                  </div>

                  {/* Events for this date */}
                  <div className="space-y-3 pl-4 border-l border-gray-300 border-dashed">
                    {group.events.map((event: Event) => (
                      <div key={event.id} className="relative">
                        <EventCard
                          id={event.id}
                          title={event.title}
                          company=""
                          price={event.price}
                          description={event.description}
                          date={event.date}
                          time={event.time}
                          ticketsAvailable={event.ticketsAvailable}
                          imageUrl={event.imageUrl}
                          category={event.category}
                          organizer={event.organizer}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
                <p className="text-gray-500">Try adjusting your filter or check back later for new events.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
