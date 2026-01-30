"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useSession } from "next-auth/react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

// Components
import {
    EventHeader,
    EventHero,
    EventInfo,
    TicketTypeSelector,
    QuantitySelector,
    TicketLimitWarning,
    BuyButton,
    DisabledBuyButton,
    UpgradeEventBanner,
    EventOrganizer,
    PurchaseConfirmModal,
    EventDescription,
    EventVenue,
} from "@/components/event";
import { PageLoader, EventNotFound } from "@/components/shared";
import WalletDrawer from "@/components/WalletDrawer";
import MintProgress from "@/components/MintProgress";
import MintResultModal from "@/components/MintResultModal";
import ResaleSection from "@/components/ResaleSection";

// Hooks
import { useEventPurchase, type MintStatus } from "@/hooks/useEventPurchase";

// Services & Types
import { eventsService, supportsCNFT } from "@/services/events";
import { usersService } from "@/services/users";
import type { Event, TicketType } from "@/types";

export default function EventDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const resolvedParams = use(params);
    const { data: session } = useSession();
    const { connected, publicKey } = useWallet();

    // Event state
    const [event, setEvent] = useState<Event | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTicketType, setSelectedTicketType] = useState<TicketType | null>(null);
    const [userTicketCount, setUserTicketCount] = useState(0);

    // Wallet drawer
    const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useState(false);

    // Upgrade state
    const [isUpgrading, setIsUpgrading] = useState(false);

    // Follow state
    const [isFollowing, setIsFollowing] = useState(false);
    const [isFollowLoading, setIsFollowLoading] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);

    // Mint result modal
    const [showMintModal, setShowMintModal] = useState(false);

    // Purchase hook
    const purchase = useEventPurchase({
        event,
        selectedTicketType,
        userTicketCount,
        onSuccess: (result) => {
            setShowMintModal(true);
            setUserTicketCount((prev) => prev + purchase.quantity);
        },
    });

    // Fetch event data
    const fetchEvent = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await eventsService.getEventById(resolvedParams.id);
            setEvent(response.event);
            setUserTicketCount(response.userTicketCount || 0);

            // Auto-select first available ticket type
            if (response.event.ticketTypes?.length) {
                const firstAvailable = response.event.ticketTypes.find(
                    (tt) => tt.available > 0
                );
                setSelectedTicketType(firstAvailable || response.event.ticketTypes[0]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch event");
        } finally {
            setIsLoading(false);
        }
    }, [resolvedParams.id]);

    // Initial fetch
    useEffect(() => {
        if (resolvedParams.id) {
            fetchEvent();
        }
    }, [resolvedParams.id, fetchEvent]);

    // Check follow status
    const checkFollowStatus = useCallback(async () => {
        if (!event?.organizer?.id || !session?.user) return;

        try {
            const data = await usersService.getProfile(event.organizer.id);
            setIsFollowing(data.isFollowing || false);
            setFollowersCount(data.followersCount || 0);
        } catch (err) {
            console.error("Error checking follow status:", err);
        }
    }, [event?.organizer?.id, session?.user]);

    useEffect(() => {
        checkFollowStatus();
    }, [checkFollowStatus]);

    // Toggle follow
    const handleFollowToggle = async () => {
        if (!event?.organizer?.id || !session?.user) return;

        setIsFollowLoading(true);
        try {
            const data = await usersService.toggleFollow(event.organizer.id);
            setIsFollowing(data.isFollowing);
            setFollowersCount(data.followersCount);
        } catch (err) {
            console.error("Error toggling follow:", err);
        } finally {
            setIsFollowLoading(false);
        }
    };

    // Handle ticket type selection
    const handleTicketTypeSelect = (ticketType: TicketType) => {
        setSelectedTicketType(ticketType);
        purchase.resetQuantity();
    };

    // Handle upgrade event
    const handleUpgradeEvent = async () => {
        if (!event) return;

        setIsUpgrading(true);
        setError(null);

        try {
            const result = await eventsService.upgradeEvent(event.id);

            if (result.success) {
                await fetchEvent();
                setError(null);
            } else {
                setError(result.error || "Failed to upgrade event");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to upgrade event");
        } finally {
            setIsUpgrading(false);
        }
    };

    // Handle buy click
    const handleBuyClick = () => {
        if (!connected || !publicKey) {
            setIsWalletDrawerOpen(true);
            return;
        }
        purchase.openConfirmModal();
    };

    // Handle mint
    const handleStartMint = async () => {
        const result = await purchase.startMint();
        if (result?.needsWallet) {
            setIsWalletDrawerOpen(true);
        }
    };

    // Handle mint modal close
    const handleMintModalClose = () => {
        setShowMintModal(false);
        purchase.reset();
        fetchEvent();
    };

    // Loading state
    if (isLoading) {
        return <PageLoader text="Loading event..." />;
    }

    // Error or not found
    if (error || !event) {
        return <EventNotFound />;
    }

    const hasTicketTypes = event.ticketTypes && event.ticketTypes.length > 0;
    const canBuy = supportsCNFT(event);

    return (
        <div
            className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-32"
            style={{ pointerEvents: "auto" }}
        >
            {/* Header */}
            <EventHeader
                connected={connected}
                publicKey={publicKey?.toBase58() || null}
            />

            {/* Hero Image */}
            <EventHero event={event} />

            <div className="px-4 max-w-2xl mx-auto">
                {/* Main Info Card */}
                <div className="bg-surface rounded-3xl p-6 -mt-12 relative z-10 border border-border/50 shadow-xl">
                    {/* Event Info */}
                    <EventInfo event={event} />

                    {/* Ticket Types Selection */}
                    {hasTicketTypes && (
                        <TicketTypeSelector
                            ticketTypes={event.ticketTypes!}
                            selectedType={selectedTicketType}
                            onSelect={handleTicketTypeSelect}
                        />
                    )}

                    {/* Ticket Limit Warning */}
                    {event.maxTicketsPerUser && (
                        <TicketLimitWarning
                            maxPerUser={event.maxTicketsPerUser}
                            currentCount={userTicketCount}
                            isAtLimit={purchase.isAtLimit}
                        />
                    )}

                    {/* Quantity Selector */}
                    {canBuy && !purchase.isAtLimit && (
                        <QuantitySelector
                            quantity={purchase.quantity}
                            maxQuantity={purchase.maxAllowed}
                            onChange={purchase.handleQuantityChange}
                        />
                    )}

                    {/* Error Display */}
                    {(error || purchase.error) && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5 flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-xs">!</span>
                            </div>
                            <span>{error || purchase.error}</span>
                        </div>
                    )}

                    {/* Upgrade Banner for Legacy Events */}
                    {!canBuy && (
                        <UpgradeEventBanner
                            isUpgrading={isUpgrading}
                            onUpgrade={handleUpgradeEvent}
                        />
                    )}

                    {/* Mint Progress */}
                    {purchase.isMinting && (
                        <div className="mb-5">
                            <MintProgress
                                status={purchase.mintStatus as MintStatus}
                                message={purchase.mintProgress}
                            />
                        </div>
                    )}

                    {/* Buy Button */}
                    {canBuy ? (
                        <BuyButton
                            totalPrice={purchase.totalPrice}
                            quantity={purchase.quantity}
                            isMinting={purchase.isMinting}
                            isAtLimit={purchase.isAtLimit}
                            isSoldOut={purchase.isSoldOut}
                            isDisabled={
                                purchase.isMinting ||
                                purchase.isAtLimit ||
                                purchase.isSoldOut
                            }
                            onClick={handleBuyClick}
                        />
                    ) : (
                        <DisabledBuyButton />
                    )}
                </div>

                {/* Resale Section */}
                <div className="mt-6">
                    <ResaleSection
                        eventId={event.id}
                        eventTitle={event.title}
                        eventImage={event.imageUrl || "/no-ticket-svgrepo-com.svg"}
                        originalPrice={event.price}
                    />
                </div>

                {/* About Event */}
                <EventDescription description={event.description} />

                {/* Venue */}
                <EventVenue
                    company={event.company || ""}
                    fullAddress={event.fullAddress}
                    locationMapUrl={event.locationMapUrl}
                />

                {/* Organizer */}
                <EventOrganizer
                    organizer={event.organizer}
                    followersCount={followersCount}
                    isFollowing={isFollowing}
                    isFollowLoading={isFollowLoading}
                    isAuthenticated={!!session?.user}
                    onFollowToggle={handleFollowToggle}
                />
            </div>

            {/* Wallet Drawer */}
            <WalletDrawer
                open={isWalletDrawerOpen}
                onOpenChange={setIsWalletDrawerOpen}
            >
                <div />
            </WalletDrawer>

            {/* Mint Result Modal */}
            <MintResultModal
                open={showMintModal}
                onClose={handleMintModalClose}
                result={purchase.mintResult}
                event={
                    event
                        ? {
                            id: event.id,
                            title: event.title,
                            imageUrl: event.imageUrl,
                            date: event.date,
                        }
                        : null
                }
            />

            {/* Purchase Confirm Modal */}
            {purchase.showConfirmModal && selectedTicketType && (
                <PurchaseConfirmModal
                    event={event}
                    ticketType={selectedTicketType}
                    quantity={purchase.quantity}
                    totalPrice={purchase.totalPrice}
                    isMinting={purchase.isMinting}
                    onConfirm={handleStartMint}
                    onCancel={purchase.closeConfirmModal}
                />
            )}
        </div>
    );
}
