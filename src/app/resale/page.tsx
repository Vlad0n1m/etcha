"use client"

import ResaleTicketCard from '@/components/ResaleTicketCard';
import ResaleCategoryFilter from '@/components/ResaleCategoryFilter';
import { Search } from 'lucide-react';
import React from 'react';
import EventCardSkeleton from '@/components/EventCardSkeleton';
import { Button } from '@/components/ui/button';
import MobileHeader from '@/components/MobileHeader';

const mockResaleTickets = [
    {
        id: '1',
        title: 'Concert: The Stars',
        company: 'User123',
        price: 150,
        date: '2025-11-15',
        location: 'Madison Square Garden',
        ticketsAvailable: 1,
        imageUrl: '/banner1.png',
        category: 'Music',
        originalPrice: 150,
        seats: 'Section A, Row 5',
    },
    {
        id: '2',
        title: 'Tech Conference 2025',
        company: 'TechFan456',
        price: 180,
        date: '2025-12-01',
        location: 'San Francisco Convention Center',
        ticketsAvailable: 1,
        imageUrl: '/etcha.png',
        category: 'Tech',
        originalPrice: 200,
        seats: 'VIP Lounge',
    },
    {
        id: '3',
        title: 'Sports Game: Lakers vs Warriors',
        company: 'SportsLover789',
        price: 150,
        date: '2025-10-30',
        location: 'Staples Center',
        ticketsAvailable: 1,
        imageUrl: '/logo.png',
        category: 'Sports',
        originalPrice: 100,
        seats: 'Courtside',
    },
    {
        id: '4',
        title: 'Art Exhibition Opening',
        company: 'ArtCollector101',
        price: 50,
        date: '2025-11-10',
        location: 'Modern Art Museum',
        ticketsAvailable: 1,
        imageUrl: '/banner1.png',
        category: 'Art',
        originalPrice: 50,
        seats: 'General Admission',
    },
    {
        id: '5',
        title: 'Music Festival Day 2',
        company: 'FestivalGoer222',
        price: 140,
        date: '2025-12-05',
        location: 'Central Park',
        ticketsAvailable: 1,
        imageUrl: '/etcha.png',
        category: 'Music',
        originalPrice: 120,
        seats: 'Stage Front',
    },
    {
        id: '6',
        title: 'Theater Play: Hamlet',
        company: 'TheaterBuff333',
        price: 70,
        date: '2025-11-20',
        location: 'Broadway Theater',
        ticketsAvailable: 1,
        imageUrl: '/logo.png',
        category: 'Theater',
        originalPrice: 80,
        seats: 'Orchestra Center',
    },
];

function ResaleClient({ tickets }: { tickets: typeof mockResaleTickets }) {
    "use client";

    const [activeFilter, setActiveFilter] = React.useState('all');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [priceFilter, setPriceFilter] = React.useState('all');
    const [priceComparison, setPriceComparison] = React.useState('all');
    const [isLoading, setIsLoading] = React.useState(true);

    const handleFilterChange = (filter: string) => {
        setActiveFilter(filter);
    };

    const handlePriceChange = (price: string) => {
        setPriceFilter(price);
    };

    const handlePriceComparisonChange = (comparison: string) => {
        setPriceComparison(comparison);
    };

    React.useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 800);

        return () => clearTimeout(timer);
    }, [activeFilter, searchQuery, priceFilter, priceComparison]);

    const handleResetFilters = () => {
        setSearchQuery('');
        setActiveFilter('all');
        setPriceFilter('all');
        setPriceComparison('all');
    };

    const filteredTickets = tickets.filter(ticket =>
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.company.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const categoryFiltered = activeFilter !== 'all'
        ? filteredTickets.filter(ticket => ticket.category.toLowerCase() === activeFilter.toLowerCase())
        : filteredTickets;

    const comparisonFiltered = priceComparison !== 'all'
        ? categoryFiltered.filter((ticket) => {
            const resalePrice = ticket.price;
            const originalPrice = ticket.originalPrice;
            if (priceComparison === 'cheaper') return resalePrice < originalPrice;
            if (priceComparison === 'more') return resalePrice > originalPrice;
            if (priceComparison === 'same') return resalePrice === originalPrice;
            return false;
        })
        : categoryFiltered;

    let finalTickets = comparisonFiltered;

    if (priceFilter === 'low') {
        finalTickets = [...comparisonFiltered].sort((a, b) => a.price - b.price);
    } else if (priceFilter === 'high') {
        finalTickets = [...comparisonFiltered].sort((a, b) => b.price - a.price);
    }

    const categoryFilteredTickets = finalTickets;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background ">
                <MobileHeader />
                <div className="container mx-auto px-4 ">
                    <div className="mb-8 pt-24">
                        <h1 className="text-3xl font-bold text-foreground mb-2">Ticket Resale Marketplace</h1>
                        <p className="text-muted-foreground">Discover and buy resale tickets for your favorite events. Sellers set their own prices.</p>
                    </div>

                    <div className="flex flex-row flex-wrap gap-3 mb-6 items-center justify-start">
                        {/* Search Bar */}
                        <div className="flex-1 min-w-[250px] relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <input
                                type="text"
                                placeholder="Search events, venues, or sellers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        {/* Price Filter Dropdown */}
                        <div className="min-w-[140px] shrink-0 flex-1">
                            <select
                                value={priceFilter}
                                onChange={(e) => handlePriceChange(e.target.value)}
                                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                            >
                                <option value="all">Sort by</option>
                                <option value="low">Price: Low to High</option>
                                <option value="high">Price: High to Low</option>
                            </select>
                        </div>

                        {/* Price Comparison Filter */}
                        <div className="min-w-[160px] shrink-0 flex-1">
                            <select
                                value={priceComparison}
                                onChange={(e) => handlePriceComparisonChange(e.target.value)}
                                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                            >
                                <option value="all">Resale Price</option>
                                <option value="cheaper">Cheaper</option>
                                <option value="more">More Expensive</option>
                                <option value="same">Same</option>
                            </select>
                        </div>

                        {/* Category Filters */}
                        <ResaleCategoryFilter onFilterChange={handleFilterChange} activeFilter={activeFilter} />
                        <Button
                            variant="outline"
                            onClick={handleResetFilters}
                            className="min-w-[120px] text-sm"
                        >
                            Reset Filters
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <EventCardSkeleton key={i} />
                        ))}
                    </div>

                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background mb-16">
            <MobileHeader />
            <div className="container mx-auto px-4 pt-24">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Ticket Resale Marketplace</h1>
                    <p className="text-muted-foreground">Discover and buy resale tickets for your favorite events. Sellers set their own prices.</p>
                </div>

                <div className="flex flex-row flex-wrap gap-3 mb-6 items-center justify-start">
                    {/* Search Bar */}
                    <div className="flex-1 min-w-[250px] relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search events, venues, or sellers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    {/* Price Filter Dropdown */}
                    <div className="min-w-[140px] shrink-0 flex-1">
                        <select
                            value={priceFilter}
                            onChange={(e) => handlePriceChange(e.target.value)}
                            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                        >
                            <option value="all">Sort by</option>
                            <option value="low">Price: Low to High</option>
                            <option value="high">Price: High to Low</option>
                        </select>
                    </div>

                    {/* Price Comparison Filter */}
                    <div className="min-w-[160px] shrink-0 flex-1">
                        <select
                            value={priceComparison}
                            onChange={(e) => handlePriceComparisonChange(e.target.value)}
                            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                        >
                            <option value="all">Resale Price</option>
                            <option value="cheaper">Cheaper</option>
                            <option value="more">More Expensive</option>
                            <option value="same">Same</option>
                        </select>
                    </div>

                    {/* Category Filters */}
                    <ResaleCategoryFilter onFilterChange={handleFilterChange} activeFilter={activeFilter} />
                    <Button
                        variant="outline"
                        onClick={handleResetFilters}
                        className="min-w-[120px] text-sm"
                    >
                        Reset Filters
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {categoryFilteredTickets.map((ticket) => (
                        <ResaleTicketCard
                            key={ticket.id}
                            title={ticket.title}
                            company={ticket.company}
                            price={ticket.price}
                            originalPrice={ticket.originalPrice}
                            date={ticket.date}
                            ticketsAvailable={ticket.ticketsAvailable}
                            imageUrl={ticket.imageUrl}
                            category={ticket.category}
                            seats={ticket.seats}
                        />
                    ))}
                </div>

                {!isLoading && categoryFilteredTickets.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">No resale tickets match your search or filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ResalePage() {
    return <ResaleClient tickets={mockResaleTickets} />;
}
