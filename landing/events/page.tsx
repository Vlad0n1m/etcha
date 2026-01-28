
"use client"

import React, { useState, useCallback, useEffect } from 'react'
import EventCard from '@/components/EventCard'
import BannerCarousel from '@/components/BannerCarousel'
import EventFilters from '@/components/EventFilters'
import MobileHeader from '@/components/MobileHeader'
import { Sparkles } from 'lucide-react'

interface Event {
  id: string
  title: string
  price: number
  date: string
  time: string
  ticketsAvailable: number
  imageUrl: string
  category: string
  description?: string
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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Mouse effect for background spotlight
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const query = activeFilter !== 'all' ? `?category=${encodeURIComponent(activeFilter)}` : ''
      const response = await fetch(`/api/events${query}`)

      if (!response.ok) {
        // Fallback for demo if API fails
        // throw new Error('Failed to fetch events')
        setEvents([
            {
                id: '1',
                title: 'Solana Breakpoint Afterparty',
                price: 2.5,
                date: new Date().toISOString(),
                time: '10:00 PM',
                ticketsAvailable: 15,
                imageUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=800&auto=format&fit=crop',
                category: 'party',
                description: 'The official afterparty for Breakpoint attendees.'
            },
            {
                id: '2',
                title: 'NFT Art Gallery Opening',
                price: 0.5,
                date: new Date(Date.now() + 86400000).toISOString(),
                time: '6:00 PM',
                ticketsAvailable: 100,
                imageUrl: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=800&auto=format&fit=crop',
                category: 'art',
                description: 'Exclusive preview of the new Generative collection.'
            },
             {
                id: '3',
                title: 'DeFi Summit 2024',
                price: 5.0,
                date: new Date(Date.now() + 86400000).toISOString(),
                time: '9:00 AM',
                ticketsAvailable: 500,
                imageUrl: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?q=80&w=800&auto=format&fit=crop',
                category: 'conference',
                description: 'Building the future of finance on Solana.'
            }
        ])
        return;
      }

      const eventsData = await response.json()
      setEvents(eventsData)
    } catch (err) {
      console.error(err)
      // setError(err instanceof Error ? err.message : 'Failed to fetch events')
    } finally {
      setIsLoading(false)
    }
  }, [activeFilter])

  // Fetch events on component mount and when filter changes
  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])


  // Group events by date
  const groupEventsByDate = (events: Event[]) => {
    const grouped = events.reduce((acc: Record<string, Event[]>, event: Event) => {
      const date = event.date.split('T')[0] // Simple date grouping
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

    // Normalize for comparison
    today.setHours(0,0,0,0)
    tomorrow.setHours(0,0,0,0)
    const checkDate = new Date(date)
    checkDate.setHours(0,0,0,0)

    if (checkDate.getTime() === today.getTime()) {
      return 'Today'
    } else if (checkDate.getTime() === tomorrow.getTime()) {
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
      description: 'Launch your event in minutes. Sell verified NFT tickets.',
      buttonText: 'Create Event',
      backgroundImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1600&auto=format&fit=crop',
      buttonLink: '/organizer/create-event'
    },
    {
      id: '2',
      title: 'Solana Breakpoint',
      description: 'The biggest crypto conference is back. Get early bird tickets.',
      backgroundImage: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1600&auto=format&fit=crop',
      buttonText: 'Buy Tickets',
      buttonLink: '/'
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
    }, 600)
  }

  return (
    <div className="relative min-h-screen bg-black text-white font-sans selection:bg-[#9945FF]/30 overflow-hidden">
        
      {/* Background FX */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-500 opacity-20"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(153, 69, 255, 0.15), transparent 40%)`
        }}
      />
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 pointer-events-none mix-blend-overlay"></div>

      {/* Mobile Header */}
      <MobileHeader />

      {/* Banner Carousel */}
      <div className="w-full pt-24 pb-6 relative z-10">
        <BannerCarousel banners={bannerData} />
      </div>

      <div className="relative z-10 pb-24">
        <div className="container mx-auto max-w-2xl lg:max-w-5xl">
          {/* Event Filters */}
          <EventFilters
            onFilterChange={handleFilterChange}
            activeFilter={activeFilter}
          />

          {/* Events List */}
          <div className="px-4 mt-8 min-h-[50vh]">
            {isLoading ? (
              // Custom Skeleton
              <div className="space-y-4">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="w-full h-32 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
                ))}
              </div>
            ) : groupedEvents.length > 0 ? (
              groupedEvents.map((group) => (
                <div key={group.date} className="mb-10">
                  {/* Date Header */}
                  <div className="sticky top-[70px] z-20 py-3 mb-4 mix-blend-difference">
                     <div className="flex items-center gap-3 backdrop-blur-md bg-black/40 w-fit px-4 py-1.5 rounded-full border border-white/10">
                        <div className="w-2 h-2 rounded-full bg-[#14F195] shadow-[0_0_8px_#14F195]"></div>
                        <h2 className="text-sm font-bold tracking-wide uppercase text-white">
                        {formatDateHeader(group.date)}
                        </h2>
                     </div>
                  </div>

                  {/* Events for this date */}
                  <div className="space-y-4">
                    {group.events.map((event: Event) => (
                      <div key={event.id} className="relative group">
                         {/* Connecting line idea - optional
                         <div className="absolute left-[-20px] top-0 bottom-0 w-px bg-white/10 hidden md:block group-last:bottom-1/2"></div> 
                         */}
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
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-full mb-6 flex items-center justify-center border border-white/10">
                  <Sparkles className="w-8 h-8 text-[#9945FF]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 font-display">No events found</h3>
                <p className="text-gray-500 max-w-xs mx-auto">Try adjusting your filters to see what's happening on the chain.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
