"use client";

import { useState, useEffect, use } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import Image from "next/image";
import Link from "next/link";
import {
    ChevronLeft,
    ExternalLink,
    Tag,
    Calendar,
    MapPin,
    AlertCircle,
    CheckCircle,
    Loader2,
    TrendingDown,
    TrendingUp,
    Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MobileHeader from "@/components/MobileHeader";
import { createListing } from "@/lib/solana/MarketplaceClient";

interface TicketData {
    nftAddress: string;
    name: string;
    symbol: string;
    image?: string | null;
    collection?: string;
    uri?: string;
    solscanUrl?: string;
    metadata?: {
        eventTitle?: string;
        eventDate?: string;
        eventLocation?: string;
        eventTime?: string;
        originalPrice?: number;
    };
}

interface ListingData {
    id: string;
    price: number;
    status: string;
    listingAddress: string;
    createdAt: string;
}

const PLATFORM_FEE = 0.025; // 2.5%

export default function TicketDetailPage({ params }: { params: Promise<{ nftAddress: string }> }) {
    const wallet = useWallet();
    const { publicKey, connected } = wallet;
    const resolvedParams = use(params);
    const nftAddress = resolvedParams.nftAddress;

    const [ticket, setTicket] = useState<TicketData | null>(null);
    const [listing, setListing] = useState<ListingData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isListing, setIsListing] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [showListingForm, setShowListingForm] = useState(false);
    const [price, setPrice] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (nftAddress) {
            fetchTicketData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nftAddress, publicKey]);

    const fetchTicketData = async () => {
        try {
            setIsLoading(true);

            // Fetch ticket info from database
            const ticketResponse = await fetch(`/api/tickets/${nftAddress}`);
            const ticketData = await ticketResponse.json();

            if (ticketResponse.ok && ticketData.success) {
                // Ticket found in database - use full event info
                const ticketInfo = ticketData.data;

                // Verify the current user owns this ticket
                if (publicKey && ticketInfo.ownerWallet !== publicKey.toString()) {
                    console.warn('Ticket is registered but not owned by current wallet');
                    setTicket({
                        nftAddress,
                        name: ticketInfo.event.title,
                        symbol: "TKT",
                        image: ticketInfo.event.imageUrl,
                        solscanUrl: `https://explorer.solana.com/address/${nftAddress}?cluster=devnet`,
                        metadata: {
                            eventTitle: ticketInfo.event.title,
                            eventDate: ticketInfo.event.date,
                            eventLocation: ticketInfo.event.location,
                            eventTime: ticketInfo.event.time,
                            originalPrice: ticketInfo.event.price,
                        },
                    });
                    setError(`This ticket is registered to a different wallet (${ticketInfo.ownerWallet.slice(0, 8)}...${ticketInfo.ownerWallet.slice(-8)}). You cannot list it for resale from this wallet. If you just purchased this ticket, please wait a few moments for the blockchain transfer to complete, then refresh this page.`);
                } else {
                    setTicket({
                        nftAddress,
                        name: ticketInfo.event.title,
                        symbol: "TKT",
                        image: ticketInfo.event.imageUrl,
                        solscanUrl: `https://explorer.solana.com/address/${nftAddress}?cluster=devnet`,
                        metadata: {
                            eventTitle: ticketInfo.event.title,
                            eventDate: ticketInfo.event.date,
                            eventLocation: ticketInfo.event.location,
                            eventTime: ticketInfo.event.time,
                            originalPrice: ticketInfo.event.price,
                        },
                    });
                }
            } else {
                // Ticket not in database - show basic blockchain info
                console.warn('Ticket not found in database, showing basic info');
                setTicket({
                    nftAddress,
                    name: `Event Ticket`,
                    symbol: "TKT",
                    solscanUrl: `https://explorer.solana.com/address/${nftAddress}?cluster=devnet`,
                });

                // Note: Listing creation won't work without database record
                setError("This ticket is not registered in our system. You can view it on Solscan but cannot list it for resale.");
            }

            // Check if there's an active listing for this NFT
            const listingsResponse = await fetch('/api/marketplace/listings?status=active');
            const listingsData = await listingsResponse.json();

            if (listingsData.success) {
                const activeListing = listingsData.data.listings.find(
                    (l: ListingData & { nftMintAddress: string }) => l.nftMintAddress === nftAddress
                );
                setListing(activeListing || null);
            }
        } catch (err) {
            console.error("Error fetching ticket data:", err);
            setError(err instanceof Error ? err.message : "Failed to load ticket data");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateListing = async () => {
        if (!publicKey || !ticket || !connected) {
            setError("Please connect your wallet");
            return;
        }

        const priceNum = parseFloat(price);
        if (!price || priceNum <= 0) {
            setError("Please enter a valid price");
            return;
        }

        setIsListing(true);
        setError("");
        setSuccess("");

        try {
            // Get the eventId from the ticket data we already fetched
            if (!ticket?.metadata) {
                throw new Error("Ticket data not loaded. Please refresh the page.");
            }

            // Fetch ticket info to get eventId
            const ticketResponse = await fetch(`/api/tickets/${nftAddress}`);
            const ticketData = await ticketResponse.json();

            if (!ticketResponse.ok || !ticketData.success) {
                throw new Error("Could not find event for this ticket");
            }

            const eventId = ticketData.data.eventId;

            // Get marketplace config (Auction House address)
            const configResponse = await fetch("/api/marketplace/config");
            const configData = await configResponse.json();

            if (!configResponse.ok || !configData.success) {
                throw new Error("Marketplace not initialized. Please contact support.");
            }

            const auctionHouseAddress = configData.data.auctionHouseAddress;

            // Create listing on blockchain (user will sign the transaction)
            console.log("🔐 Please approve the transaction in your wallet...");
            const listingResult = await createListing(
                wallet,
                auctionHouseAddress,
                nftAddress,
                priceNum
            );

            console.log("✅ Blockchain transaction confirmed!");

            // Save listing to database
            const response = await fetch("/api/marketplace/listings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    nftMintAddress: nftAddress,
                    price: priceNum,
                    eventId: eventId,
                    sellerWallet: publicKey.toString(),
                    listingAddress: listingResult.listingAddress,
                    transactionHash: listingResult.transactionHash,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Failed to save listing to database");
            }

            setSuccess("Listing created successfully!");
            setShowListingForm(false);
            setPrice("");

            // Refresh data
            await fetchTicketData();
        } catch (err) {
            console.error("Error creating listing:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to create listing";

            // Check for common wallet errors
            if (errorMessage.includes("User rejected")) {
                setError("Transaction cancelled by user");
            } else if (errorMessage.includes("Wallet not connected")) {
                setError("Please connect your wallet and try again");
            } else {
                setError(errorMessage);
            }
        } finally {
            setIsListing(false);
        }
    };

    const handleCancelListing = async () => {
        if (!publicKey || !listing) {
            setError("Cannot cancel listing");
            return;
        }

        setIsCancelling(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(`/api/marketplace/listings/${listing.id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    sellerWallet: publicKey.toString(),
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Failed to cancel listing");
            }

            setSuccess("Listing cancelled successfully!");

            // Refresh data
            await fetchTicketData();
        } catch (err) {
            console.error("Error cancelling listing:", err);
            setError(err instanceof Error ? err.message : "Failed to cancel listing");
        } finally {
            setIsCancelling(false);
        }
    };

    const priceNum = parseFloat(price) || 0;
    const platformFeeAmount = priceNum * PLATFORM_FEE;
    const netEarnings = priceNum - platformFeeAmount;

    const getPriceComparison = () => {
        if (!ticket?.metadata?.originalPrice || !priceNum) return null;

        const diff = priceNum - ticket.metadata.originalPrice;
        if (diff < 0) {
            return {
                icon: TrendingDown,
                color: "text-green-600",
                bgColor: "bg-green-50",
                text: `${Math.abs(diff).toFixed(2)} SOL cheaper`,
            };
        } else if (diff > 0) {
            return {
                icon: TrendingUp,
                color: "text-red-600",
                bgColor: "bg-red-50",
                text: `${diff.toFixed(2)} SOL higher`,
            };
        } else {
            return {
                icon: Minus,
                color: "text-gray-600",
                bgColor: "bg-gray-50",
                text: "Same as original",
            };
        }
    };

    if (!connected) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Connect Your Wallet</h2>
                    <p className="text-gray-600 mb-8">Connect your Solana wallet to view ticket details</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading ticket...</p>
                </div>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Ticket Not Found</h2>
                    <p className="text-gray-600 mb-8">The ticket you&apos;re looking for doesn&apos;t exist</p>
                    <Link href="/profile">
                        <Button>Back to Profile</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const priceComparison = getPriceComparison();

    return (
        <div className="min-h-screen bg-background pb-24">
            <MobileHeader />

            <div className="px-4 pt-24 pb-8 max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <Link href="/profile" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                        <ChevronLeft className="w-5 h-5" />
                        <span className="font-medium">Back to Profile</span>
                    </Link>
                </div>

                {/* Ticket Card */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mb-6">
                    <div className="aspect-video bg-gray-50 relative">
                        {ticket.image ? (
                            <Image
                                src={ticket.image}
                                alt={ticket.name}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-4xl">
                                {ticket.symbol || "NFT"}
                            </div>
                        )}
                    </div>

                    <div className="p-6">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">{ticket.name}</h1>

                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-sm text-gray-600 font-mono">
                                {ticket.nftAddress.slice(0, 8)}...{ticket.nftAddress.slice(-8)}
                            </span>
                            <a
                                href={ticket.solscanUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                            >
                                View on Solscan
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>

                        {/* Event Details */}
                        {ticket.metadata && (
                            <div className="space-y-3 pt-4 border-t border-gray-200">
                                {ticket.metadata.eventTitle && (
                                    <div className="flex items-start gap-3">
                                        <Tag className="w-5 h-5 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-500">Event</p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {ticket.metadata.eventTitle}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {ticket.metadata.eventDate && (
                                    <div className="flex items-start gap-3">
                                        <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-500">Date</p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {new Date(ticket.metadata.eventDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {ticket.metadata.eventLocation && (
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-500">Location</p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {ticket.metadata.eventLocation}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {ticket.metadata.originalPrice && (
                                    <div className="flex items-start gap-3">
                                        <Tag className="w-5 h-5 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-500">Original Price</p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {ticket.metadata.originalPrice} SOL
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Listing Status / Actions */}
                {listing ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900">Listing Status</h2>
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                Active
                            </span>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Listed Price</span>
                                <span className="font-bold text-gray-900">{listing.price} SOL</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Listed On</span>
                                <span className="text-gray-700">
                                    {new Date(listing.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        <Button
                            onClick={handleCancelListing}
                            disabled={isCancelling}
                            variant="outline"
                            className="w-full border-red-300 text-red-600 hover:bg-red-50"
                        >
                            {isCancelling ? "Cancelling..." : "Cancel Listing"}
                        </Button>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Resale Options</h2>

                        {!ticket?.metadata ? (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-800 mb-2">
                                    <strong>Listing Unavailable</strong>
                                </p>
                                <p className="text-sm text-yellow-700">
                                    This ticket is not registered in our system. It may have been transferred from another wallet or purchased outside our platform.
                                </p>
                            </div>
                        ) : !showListingForm ? (
                            <div>
                                <p className="text-gray-600 text-sm mb-4">
                                    List this ticket for resale on the marketplace and earn money by selling to other users.
                                </p>
                                <Button
                                    onClick={() => setShowListingForm(true)}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    List for Resale
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
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

                                {priceComparison && (
                                    <div className={`flex items-center gap-2 p-3 rounded-lg ${priceComparison.bgColor}`}>
                                        <priceComparison.icon className={`w-5 h-5 ${priceComparison.color}`} />
                                        <span className={`text-sm font-medium ${priceComparison.color}`}>
                                            {priceComparison.text}
                                        </span>
                                    </div>
                                )}

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
                                                <span className="font-semibold text-gray-900">You&apos;ll Receive</span>
                                                <span className="font-bold text-green-600 text-lg">
                                                    {netEarnings.toFixed(4)} SOL
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => {
                                            setShowListingForm(false);
                                            setPrice("");
                                            setError("");
                                        }}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleCreateListing}
                                        disabled={!price || priceNum <= 0 || isListing}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    >
                                        {isListing ? "Creating..." : "Create Listing"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Success/Error Messages */}
                {success && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-green-800">{success}</p>
                    </div>
                )}

                {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

