"use client";

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ArrowDownCircle, ArrowUpCircle, Equal, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

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
        title: string;
        imageUrl: string;
    };
}

interface ResaleSectionProps {
    eventId: string;
    eventTitle: string;
    eventImage: string;
    originalPrice: number;
}

export default function ResaleSection({ eventId, eventTitle, eventImage, originalPrice }: ResaleSectionProps) {
    const { publicKey } = useWallet();
    const [listings, setListings] = useState<ResaleListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [buyingId, setBuyingId] = useState<string | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchListings();
    }, [eventId]);

    const fetchListings = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/marketplace/listings?eventId=${eventId}&status=active`);
            const data = await response.json();

            if (data.success) {
                // Sort by price (cheaper first)
                const sortedListings = data.data.listings.sort((a: ResaleListing, b: ResaleListing) => a.price - b.price);
                setListings(sortedListings);
            }
        } catch (err) {
            console.error('Error fetching resale listings:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBuy = async (listing: ResaleListing) => {
        if (!publicKey) {
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
            const response = await fetch('/api/marketplace/buy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    listingId: listing.id,
                    buyerWallet: publicKey.toString(),
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to complete purchase');
            }

            // Refresh listings
            await fetchListings();
            alert('Purchase successful! Check your profile for the ticket.');
        } catch (err) {
            console.error('Error buying ticket:', err);
            setError(err instanceof Error ? err.message : 'Failed to buy ticket');
        } finally {
            setBuyingId(null);
        }
    };

    const getPriceBadge = (comparison: string, diff: number) => {
        if (comparison === 'cheaper') {
            return {
                icon: ArrowDownCircle,
                text: `${Math.abs(diff).toFixed(2)} SOL cheaper`,
                color: 'text-green-600',
                bgColor: 'bg-green-50',
                borderColor: 'border-green-200',
            };
        } else if (comparison === 'higher') {
            return {
                icon: ArrowUpCircle,
                text: `+${diff.toFixed(2)} SOL`,
                color: 'text-red-600',
                bgColor: 'bg-red-50',
                borderColor: 'border-red-200',
            };
        } else {
            return {
                icon: Equal,
                text: 'Same price',
                color: 'text-gray-600',
                bgColor: 'bg-gray-50',
                borderColor: 'border-gray-200',
            };
        }
    };

    if (isLoading) {
        return (
            <div className="mt-8 border-t border-gray-200 pt-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Resale Marketplace</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="bg-gray-100 rounded-lg h-32 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (listings.length === 0) {
        return null; // Don't show section if no listings
    }

    return (
        <div className="mt-8 border-t border-gray-200 pt-8">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Resale Marketplace</h3>
                    <p className="text-sm text-gray-600">Buy tickets from other attendees</p>
                </div>
                <span className="text-sm text-gray-500">{listings.length} available</span>
            </div>

            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map((listing) => {
                    const badge = getPriceBadge(listing.priceComparison, listing.priceDifference);
                    const BadgeIcon = badge.icon;

                    return (
                        <div
                            key={listing.id}
                            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
                        >
                            <div className="flex items-start gap-3 mb-3">
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                    <Image
                                        src={eventImage}
                                        alt={eventTitle}
                                        width={64}
                                        height={64}
                                        className="object-cover w-full h-full"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500 mb-1">Seller: {listing.sellerNickname}</p>
                                    <p className="font-bold text-xl text-gray-900">{listing.price.toFixed(2)} SOL</p>
                                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium mt-1 ${badge.bgColor} ${badge.color} border ${badge.borderColor}`}>
                                        <BadgeIcon className="w-3 h-3" />
                                        {badge.text}
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={() => handleBuy(listing)}
                                disabled={buyingId === listing.id || !publicKey}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                size="sm"
                            >
                                {buyingId === listing.id ? (
                                    'Processing...'
                                ) : (
                                    <>
                                        <ShoppingCart className="w-4 h-4 mr-2" />
                                        Buy from Resale
                                    </>
                                )}
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

