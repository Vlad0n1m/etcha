"use client"

import ResaleTicketCard from '@/components/ResaleTicketCard';
import ResaleCategoryFilter from '@/components/ResaleCategoryFilter';
import { Search, AlertCircle } from 'lucide-react';
import React from 'react';
import EventCardSkeleton from '@/components/EventCardSkeleton';
import { Button } from '@/components/ui/button';
import MobileHeader from '@/components/MobileHeader';

interface ResaleTicket {
    listingId: string
    nftMintAddress: string
    price: number // в SOL
    originalPrice: number // в SOL
    event: {
        id: string
        title: string
        imageUrl: string
        date: string // ISO format
        time: string
        fullAddress: string
        category: string
        organizer: {
            name: string
            walletAddress: string
        } | null
    }
    seller: {
        walletAddress: string
        nickname?: string
        organizer?: {
            companyName: string
        }
    }
}

function ResaleClient() {
    "use client";

    const [activeFilter, setActiveFilter] = React.useState('all');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [priceFilter, setPriceFilter] = React.useState('all');
    const [priceComparison, setPriceComparison] = React.useState('all');
    const [isLoading, setIsLoading] = React.useState(true);
    const [resaleTickets, setResaleTickets] = React.useState<ResaleTicket[]>([]);
    const [error, setError] = React.useState<string | null>(null);

    // Load resale tickets from API
    const loadResaleTickets = React.useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch('/api/resale');
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load resale tickets');
            }

            setResaleTickets(data.listings || []);
        } catch (err: unknown) {
            console.error('Error loading resale tickets:', err);
            const message = err instanceof Error ? err.message : 'Failed to load resale tickets';
            setError(message);
            setResaleTickets([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadResaleTickets();
    }, [loadResaleTickets]);

    const handleFilterChange = (filter: string) => {
        setActiveFilter(filter);
    };

    const handlePriceChange = (price: string) => {
        setPriceFilter(price);
    };

    const handlePriceComparisonChange = (comparison: string) => {
        setPriceComparison(comparison);
    };

    // Format date like on profile page
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    // Format address like on ticket detail page
    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-6)}`;
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setActiveFilter('all');
        setPriceFilter('all');
        setPriceComparison('all');
    };

    // Transform resale tickets to format expected by ResaleTicketCard
    const transformedTickets = resaleTickets.map((ticket) => {
        // Get seller display name
        let sellerName = ticket.seller.walletAddress;
        if (ticket.seller.organizer?.companyName) {
            sellerName = ticket.seller.organizer.companyName;
        } else if (ticket.seller.nickname) {
            sellerName = ticket.seller.nickname;
        } else {
            sellerName = formatAddress(ticket.seller.walletAddress);
        }

        return {
            id: ticket.listingId,
            listingId: ticket.listingId,
            title: ticket.event.title,
            company: sellerName,
            price: ticket.price,
            originalPrice: ticket.originalPrice,
            date: formatDate(ticket.event.date),
            time: ticket.event.time,
            imageUrl: ticket.event.imageUrl,
            category: ticket.event.category,
            seats: 'General Admission',
            ticketsAvailable: 1,
        };
    });

    const filteredTickets = transformedTickets.filter(ticket =>
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
            <div className="min-h-screen bg-background">
                <MobileHeader />
                <div className="container mx-auto px-4">
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
                            id={ticket.id}
                            listingId={ticket.listingId}
                            title={ticket.title}
                            company={ticket.company}
                            price={ticket.price}
                            originalPrice={ticket.originalPrice}
                            date={ticket.date}
                            time={ticket.time}
                            ticketsAvailable={ticket.ticketsAvailable}
                            imageUrl={ticket.imageUrl}
                            category={ticket.category}
                            seats={ticket.seats}
                            onPurchaseSuccess={loadResaleTickets}
                        />
                    ))}
                </div>

                {error && (
                    <div className="text-center py-12">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-muted-foreground">{error}</p>
                        <Button
                            onClick={() => window.location.reload()}
                            variant="outline"
                            className="mt-4"
                        >
                            Retry
                        </Button>
                    </div>
                )}

                {!isLoading && !error && categoryFilteredTickets.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">No resale tickets match your search or filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ResalePage() {
    return <ResaleClient />;
}
