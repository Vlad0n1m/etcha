"use client"

import React, { useState, useMemo } from 'react'
import EventCard from '@/components/EventCard'
import BannerCarousel from '@/components/BannerCarousel'
import EventFilters from '@/components/EventFilters'
import MobileHeader from '@/components/MobileHeader'


// Test data for events with different dates
const testEvents = [
  {
    id: '1',
    title: "Arcium's <encrypted> Side Track",
    company: 'Arcium',
    price: 20000,
    date: '2024-03-15',
    time: '19:00',
    ticketsAvailable: 150,
    imageUrl: '/logo.png',
    category: 'Blockchain',
    description: 'Join us for an exclusive deep dive into Arcium\'s innovative encrypted side track technology. This event will cover the latest developments in privacy-preserving blockchain solutions and their practical applications in DeFi.',
    fullAddress: 'Tech Conference Center, 123 Innovation Street, San Francisco, CA 94105',
    organizer: {
      name: 'Arcium Team',
      avatar: '/logo.png',
      description: 'Leading blockchain privacy solutions provider'
    }
  },
  {
    id: '2',
    title: 'Blockchain Security Workshop',
    company: 'Crypto Ventures',
    price: 8000,
    date: '2024-03-15',
    time: '21:30',
    ticketsAvailable: 75,
    imageUrl: '/logo.png',
    category: 'Blockchain',
    description: 'Comprehensive workshop covering the latest blockchain security best practices, smart contract auditing, and vulnerability assessment techniques.',
    fullAddress: 'Crypto Hub, 456 Blockchain Avenue, New York, NY 10001',
    organizer: {
      name: 'Crypto Ventures',
      avatar: '/logo.png',
      description: 'Blockchain security experts and consultants'
    }
  },
  {
    id: '3',
    title: 'AI & Machine Learning Summit',
    company: 'DataScience Pro',
    price: 12000,
    date: '2024-03-16',
    time: '14:00',
    ticketsAvailable: 30,
    imageUrl: '/logo.png',
    category: 'AI/ML',
    description: 'Explore the latest trends in artificial intelligence and machine learning. Learn from industry experts about cutting-edge algorithms and real-world applications.',
    fullAddress: 'AI Innovation Center, 789 ML Boulevard, Silicon Valley, CA 94043',
    organizer: {
      name: 'DataScience Pro',
      avatar: '/logo.png',
      description: 'AI and ML research organization'
    }
  },
  {
    id: '4',
    title: 'Web3 Developer Conference',
    company: 'DeFi Labs',
    price: 5000,
    date: '2024-03-16',
    time: '16:30',
    ticketsAvailable: 200,
    imageUrl: '/logo.png',
    category: 'Web3',
    description: 'Connect with fellow Web3 developers and learn about the latest decentralized technologies, DeFi protocols, and blockchain development tools.',
    fullAddress: 'Web3 Hub, 321 Decentralized Street, Austin, TX 78701',
    organizer: {
      name: 'DeFi Labs',
      avatar: '/logo.png',
      description: 'DeFi protocol development team'
    }
  },
  {
    id: '5',
    title: 'Digital Marketing Masterclass',
    company: 'Growth Marketing Co.',
    price: 35000,
    date: '2024-03-17',
    time: '10:00',
    ticketsAvailable: 50,
    imageUrl: '/logo.png',
    category: 'Marketing',
    description: 'Master the art of digital marketing with proven strategies for growth, conversion optimization, and customer acquisition.',
    fullAddress: 'Marketing Institute, 654 Growth Avenue, Chicago, IL 60601',
    organizer: {
      name: 'Growth Marketing Co.',
      avatar: '/logo.png',
      description: 'Digital marketing experts and growth consultants'
    }
  },
  {
    id: '6',
    title: 'Free Web Development Workshop',
    company: 'Code Academy',
    price: 0,
    date: '2024-03-15',
    time: '18:00',
    ticketsAvailable: 100,
    imageUrl: '/logo.png',
    category: 'Development',
    description: 'Learn web development fundamentals in this hands-on workshop. Perfect for beginners looking to start their coding journey.',
    fullAddress: 'Code Academy Campus, 987 Learning Lane, Seattle, WA 98101',
    organizer: {
      name: 'Code Academy',
      avatar: '/logo.png',
      description: 'Free coding education platform'
    }
  },
  {
    id: '7',
    title: 'Open Source Community Meetup',
    company: 'GitHub Community',
    price: 0,
    date: '2024-03-16',
    time: '19:30',
    ticketsAvailable: 200,
    imageUrl: '/logo.png',
    category: 'Community',
    description: 'Join the open source community for networking, project showcases, and discussions about the future of collaborative development.',
    fullAddress: 'Community Center, 147 Open Source Drive, Boston, MA 02101',
    organizer: {
      name: 'GitHub Community',
      avatar: '/logo.png',
      description: 'Open source community organizers'
    }
  }
]

// Group events by date
const groupEventsByDate = (events: typeof testEvents) => {
  const grouped = events.reduce((acc, event) => {
    const date = event.date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(event)
    return acc
  }, {} as Record<string, typeof testEvents>)

  // Sort dates and events within each date by time
  return Object.keys(grouped)
    .sort()
    .map(date => ({
      date,
      events: grouped[date].sort((a, b) => a.time.localeCompare(b.time))
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
    title: 'Become a Sponsor',
    description: 'Reach 130,000+ top-tier talent in under 5 clicks. Get high-quality work done across content, development, and design.',
    buttonText: 'Get Started',
    backgroundImage: '/banner1.png',
    buttonLink: '/sponsor'
  },
  {
    id: '2',
    title: 'Connect Your Wallet',
    description: 'Join our community and start participating in events. Connect your Solana wallet to get started.',
    buttonText: 'Connect Wallet',
    backgroundImage: '/banner1.png'
  },
  {
    id: '3',
    title: 'Become a Sponsor',
    description: 'Reach 130,000+ top-tier talent in under 5 clicks. Get high-quality work done across content, development, and design.',
    buttonText: 'Get Started',
    backgroundImage: '/banner1.png',
    buttonLink: '/sponsor'
  },
]

export default function Home() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(false)

  // Фильтрация событий
  const filteredEvents = useMemo(() => {
    return testEvents.filter(event => {
      if (activeFilter === 'all') return true
      return event.category.toLowerCase() === activeFilter.toLowerCase()
    })
  }, [activeFilter])

  const groupedEvents = groupEventsByDate(filteredEvents)

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
    // Симулируем загрузку при смене фильтра
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

      <div className="py-4 flex-1">
        <div className="container mx-auto">
          {/* Event Filters */}
          <EventFilters
            onFilterChange={handleFilterChange}
            activeFilter={activeFilter}
          />

          {/* Events List */}
          <div className="px-4 pb-4">
            {isLoading ? (
              // Показываем скелетоны во время загрузки
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
                    {group.events.map((event) => (
                      <div key={event.id} className="relative">
                        <EventCard
                          id={event.id}
                          title={event.title}
                          company={event.company}
                          price={event.price}
                          date={event.date}
                          time={event.time}
                          ticketsAvailable={event.ticketsAvailable}
                          imageUrl={event.imageUrl}
                          category={event.category}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
