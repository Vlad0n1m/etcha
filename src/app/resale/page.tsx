"use client"

import ResaleTicketCard from '@/components/ResaleTicketCard';
import ResaleCategoryFilter from '@/components/ResaleCategoryFilter';
import { Search } from 'lucide-react';
import React from 'react';
import EventCardSkeleton from '@/components/EventCardSkeleton';
import { Button } from '@/components/ui/button';
import MobileHeader from '@/components/MobileHeader';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, VersionedTransaction } from '@solana/web3.js';

interface ResaleListing {
    id: string;
    nftMintAddress: string;
    price: number;
    originalPrice: number;
    priceComparison: 'cheaper' | 'same' | 'higher';
    priceDifference: number;
    sellerNickname: string;
    seller: {
        walletAddress: string;
    };
    createdAt: string;
    event: {
        id: string;
        title: string;
        imageUrl: string;
        date: string;
        time: string;
        fullAddress: string;
        category: {
            name: string;
            value: string;
        };
    };
}

function ResaleClient() {
    "use client";

    const { publicKey, signTransaction } = useWallet();
    const { connection } = useConnection();

    const [activeFilter, setActiveFilter] = React.useState('all');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [priceFilter, setPriceFilter] = React.useState('all');
    const [priceComparison, setPriceComparison] = React.useState('all');
    const [isLoading, setIsLoading] = React.useState(true);
    const [listings, setListings] = React.useState<ResaleListing[]>([]);
    const [buyingId, setBuyingId] = React.useState<string | null>(null);
    const [error, setError] = React.useState('');

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
        fetchListings();
    }, []);

    const fetchListings = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/marketplace/listings?status=active');
            const data = await response.json();

            if (data.success) {
                setListings(data.data.listings);
            }
        } catch (err) {
            console.error('Error fetching listings:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setActiveFilter('all');
        setPriceFilter('all');
        setPriceComparison('all');
    };

    const handleBuy = async (listing: ResaleListing) => {
        // Prevent double-clicks and concurrent purchases
        if (buyingId) {
            console.log('⚠️ Purchase already in progress, ignoring click');
            return;
        }

        if (!publicKey || !signTransaction) {
            setError('Please connect your wallet to buy');
            return;
        }

        if (listing.seller.walletAddress === publicKey.toString()) {
            setError('You cannot buy your own listing');
            return;
        }

        setBuyingId(listing.id);
        setError('');

        try {
            // Step 1: Prepare purchase transaction
            console.log('📝 Preparing purchase transaction...');
            const prepareResponse = await fetch('/api/marketplace/prepare-buy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    listingId: listing.id,
                    buyerWallet: publicKey.toString(),
                }),
            });

            if (!prepareResponse.ok) {
                const errorData = await prepareResponse.json();
                throw new Error(errorData.error || 'Failed to prepare purchase');
            }

            const { data: prepareData } = await prepareResponse.json();
            const { transaction: base64Transaction, price } = prepareData;

            // Step 2: Deserialize and sign transaction
            console.log('💳 Preparing transaction for signature...');
            console.log(`💰 Total cost: ${price} SOL`);

            const transactionBuffer = Buffer.from(base64Transaction, 'base64');
            let transaction: Transaction | VersionedTransaction;
            let isVersioned = false;

            // Check if it's a versioned transaction (starts with version byte)
            if (transactionBuffer[0] > 127) {
                // Versioned transaction
                transaction = VersionedTransaction.deserialize(transactionBuffer);
                isVersioned = true;
            } else {
                // Legacy transaction
                transaction = Transaction.from(transactionBuffer);
                isVersioned = false;
            }

            // Log transaction info based on type
            if (isVersioned) {
                console.log('🔍 Versioned transaction detected');
                console.log('🔍 Transaction signatures before user sign:', (transaction as VersionedTransaction).signatures.length);
            } else {
                console.log('🔍 Legacy transaction detected');
                console.log('🔍 Transaction signatures before user sign:', (transaction as Transaction).signatures.length);
            }

            // User signs the transaction (may be partially signed by platform)
            console.log('✍️ Requesting user signature...');
            const signedTransaction = await signTransaction(transaction);

            console.log('✅ User signed transaction');

            // Manually send the signed transaction
            console.log('📤 Sending transaction to blockchain...');
            const rawTransaction = signedTransaction.serialize();

            let transactionSignature: string;
            try {
                transactionSignature = await connection.sendRawTransaction(rawTransaction, {
                    skipPreflight: false,
                    preflightCommitment: 'confirmed',
                });
                console.log('✅ Transaction sent:', transactionSignature);
            } catch (sendError: unknown) {
                // If transaction was already processed, extract signature and continue
                const errorMessage = sendError instanceof Error ? sendError.message : String(sendError);
                if (errorMessage.includes('already been processed')) {
                    console.log('⚠️ Transaction already processed, extracting signature...');
                    // Calculate transaction signature from the signed transaction
                    let firstSignature: Uint8Array | null = null;

                    if (isVersioned) {
                        const vTx = signedTransaction as VersionedTransaction;
                        firstSignature = vTx.signatures[0] || null;
                    } else {
                        const legacyTx = signedTransaction as Transaction;
                        firstSignature = legacyTx.signatures[0]?.signature || null;
                    }

                    if (firstSignature) {
                        const bs58 = await import('bs58');
                        transactionSignature = bs58.default.encode(firstSignature);
                        console.log('✅ Extracted signature:', transactionSignature);
                    } else {
                        throw new Error('Transaction already processed but signature not found');
                    }
                } else {
                    throw sendError;
                }
            }

            console.log('⏳ Waiting for confirmation...');

            // Step 3: Wait for confirmation
            const confirmation = await connection.confirmTransaction(transactionSignature, 'confirmed');

            if (confirmation.value.err) {
                throw new Error('Transaction failed on blockchain');
            }

            console.log('✅ Transaction confirmed on blockchain');

            // Step 4: Confirm purchase on backend
            console.log('📝 Recording purchase in database...');
            const confirmResponse = await fetch('/api/marketplace/confirm-buy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    listingId: listing.id,
                    buyerWallet: publicKey.toString(),
                    transactionSignature,
                }),
            });

            if (!confirmResponse.ok) {
                const errorData = await confirmResponse.json();
                throw new Error(errorData.error || 'Failed to confirm purchase');
            }

            const { data: confirmData } = await confirmResponse.json();

            console.log('🎉 Purchase completed successfully!');
            console.log('Transaction:', transactionSignature);

            // Refresh listings
            await fetchListings();
            alert(`Purchase successful! NFT: ${confirmData.nftAddress}\nTransaction: ${transactionSignature}`);
        } catch (err) {
            console.error('Error buying ticket:', err);
            setError(err instanceof Error ? err.message : 'Failed to buy ticket');
        } finally {
            setBuyingId(null);
        }
    };

    const filteredTickets = listings.filter(listing =>
        listing.event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.event.fullAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.sellerNickname.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const categoryFiltered = activeFilter !== 'all'
        ? filteredTickets.filter(listing => listing.event.category.value.toLowerCase() === activeFilter.toLowerCase())
        : filteredTickets;

    const comparisonFiltered = priceComparison !== 'all'
        ? categoryFiltered.filter((listing) => {
            if (priceComparison === 'cheaper') return listing.priceComparison === 'cheaper';
            if (priceComparison === 'more') return listing.priceComparison === 'higher';
            if (priceComparison === 'same') return listing.priceComparison === 'same';
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

                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

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
                    {categoryFilteredTickets.map((listing) => (
                        <ResaleTicketCard
                            key={listing.id}
                            title={listing.event.title}
                            company={listing.sellerNickname}
                            price={listing.price}
                            originalPrice={listing.originalPrice}
                            date={new Date(listing.event.date).toISOString().split('T')[0]}
                            time={listing.event.time}
                            ticketsAvailable={1}
                            imageUrl={listing.event.imageUrl}
                            category={listing.event.category.name}
                            seats="General Admission"
                            isLoading={buyingId === listing.id}
                            onBuy={() => handleBuy(listing)}
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
    return <ResaleClient />;
}
