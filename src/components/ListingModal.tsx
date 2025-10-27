"use client";

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { X, AlertCircle, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

interface Ticket {
    nftAddress: string;
    name: string;
    symbol: string;
    image?: string | null;
    eventId?: string;
    eventTitle?: string;
    originalPrice?: number;
}

interface ListingModalProps {
    isOpen: boolean;
    onClose: () => void;
    tickets: Ticket[];
    onListingCreated: () => void;
}

const PLATFORM_FEE = 0.025; // 2.5%

export default function ListingModal({ isOpen, onClose, tickets, onListingCreated }: ListingModalProps) {
    const { publicKey } = useWallet();
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [price, setPrice] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedTicket(null);
            setPrice('');
            setError('');
            setSuccess(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const priceNum = parseFloat(price) || 0;
    const platformFeeAmount = priceNum * PLATFORM_FEE;
    const netEarnings = priceNum - platformFeeAmount;

    const getPriceComparison = () => {
        if (!selectedTicket?.originalPrice || !priceNum) return null;

        const diff = priceNum - selectedTicket.originalPrice;
        if (diff < 0) {
            return {
                type: 'cheaper',
                icon: TrendingDown,
                color: 'text-green-600',
                bgColor: 'bg-green-50',
                text: `${Math.abs(diff).toFixed(2)} SOL cheaper`,
            };
        } else if (diff > 0) {
            return {
                type: 'higher',
                icon: TrendingUp,
                color: 'text-red-600',
                bgColor: 'bg-red-50',
                text: `${diff.toFixed(2)} SOL higher`,
            };
        } else {
            return {
                type: 'same',
                icon: Minus,
                color: 'text-gray-600',
                bgColor: 'bg-gray-50',
                text: 'Same as original',
            };
        }
    };

    const handleSubmit = async () => {
        if (!selectedTicket || !publicKey) {
            setError('Please select a ticket and connect your wallet');
            return;
        }

        if (!price || priceNum <= 0) {
            setError('Please enter a valid price');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Create listing
            const response = await fetch('/api/marketplace/listings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nftMintAddress: selectedTicket.nftAddress,
                    price: priceNum,
                    eventId: selectedTicket.eventId,
                    sellerWallet: publicKey.toString(),
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to create listing');
            }

            setSuccess(true);
            setTimeout(() => {
                onListingCreated();
                onClose();
            }, 2000);
        } catch (err) {
            console.error('Error creating listing:', err);
            setError(err instanceof Error ? err.message : 'Failed to create listing');
        } finally {
            setIsLoading(false);
        }
    };

    const priceComparison = getPriceComparison();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">List Ticket for Resale</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        disabled={isLoading}
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg
                                    className="w-8 h-8 text-green-600"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Listing Created!</h3>
                            <p className="text-gray-600">Your ticket is now listed in the marketplace</p>
                        </div>
                    ) : (
                        <>
                            {/* Ticket Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-3">
                                    Select Ticket
                                </label>
                                <div className="space-y-3 max-h-60 overflow-y-auto">
                                    {tickets.length === 0 ? (
                                        <p className="text-gray-500 text-sm">No tickets available to list</p>
                                    ) : (
                                        tickets.map((ticket) => (
                                            <button
                                                key={ticket.nftAddress}
                                                onClick={() => setSelectedTicket(ticket)}
                                                className={`w-full p-4 border-2 rounded-xl flex items-center gap-4 transition-all ${selectedTicket?.nftAddress === ticket.nftAddress
                                                        ? 'border-blue-600 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                                    }`}
                                            >
                                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                                    {ticket.image ? (
                                                        <Image
                                                            src={ticket.image}
                                                            alt={ticket.name}
                                                            width={64}
                                                            height={64}
                                                            className="object-cover w-full h-full"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-sm">
                                                            {ticket.symbol || 'NFT'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <p className="font-semibold text-gray-900 line-clamp-1">
                                                        {ticket.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 font-mono mt-1">
                                                        {ticket.nftAddress.slice(0, 8)}...{ticket.nftAddress.slice(-8)}
                                                    </p>
                                                    {ticket.originalPrice && (
                                                        <p className="text-xs text-gray-600 mt-1">
                                                            Original: {ticket.originalPrice} SOL
                                                        </p>
                                                    )}
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Price Input */}
                            {selectedTicket && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-2">
                                            Resale Price (SOL)
                                        </label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            placeholder="Enter price in SOL"
                                            className="text-lg"
                                        />
                                    </div>

                                    {/* Price Comparison */}
                                    {priceComparison && (
                                        <div
                                            className={`flex items-center gap-2 p-3 rounded-lg ${priceComparison.bgColor}`}
                                        >
                                            <priceComparison.icon className={`w-5 h-5 ${priceComparison.color}`} />
                                            <span className={`text-sm font-medium ${priceComparison.color}`}>
                                                {priceComparison.text}
                                            </span>
                                        </div>
                                    )}

                                    {/* Earnings Breakdown */}
                                    {priceNum > 0 && (
                                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                            <h4 className="font-semibold text-gray-900 text-sm mb-3">
                                                Earnings Breakdown
                                            </h4>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Listing Price</span>
                                                <span className="font-medium text-gray-900">
                                                    {priceNum.toFixed(2)} SOL
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Platform Fee (2.5%)</span>
                                                <span className="font-medium text-red-600">
                                                    -{platformFeeAmount.toFixed(4)} SOL
                                                </span>
                                            </div>
                                            <div className="border-t border-gray-200 pt-2 mt-2">
                                                <div className="flex justify-between">
                                                    <span className="font-semibold text-gray-900">You'll Receive</span>
                                                    <span className="font-bold text-green-600 text-lg">
                                                        {netEarnings.toFixed(4)} SOL
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-800">{error}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!success && (
                    <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!selectedTicket || !price || priceNum <= 0 || isLoading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                            {isLoading ? 'Creating Listing...' : 'List for Sale'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

