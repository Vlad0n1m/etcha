"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

// Components
import {
  ProfileHeader,
  ProfileCard,
  WalletSection,
  ProfileTabs,
  TicketTabs,
  TicketsList,
  AttendingEvents,
  PostsList,
} from "@/components/profile";

// Services & Types
import { usersService, canCreateEvents } from "@/services/users";
import { useAuth } from "@/components/AuthProvider";
import type { UserProfile, Ticket, Post, EventListItem } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UserProfilePage({ params }: PageProps) {
  const { id: userId } = use(params);
  const { token: walletToken } = useAuth();
  const { data: session } = useSession();
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Tabs state
  const [activeTab, setActiveTab] = useState<"posts" | "tickets">("posts");
  const [ticketsTab, setTicketsTab] = useState<"bought" | "on_resale" | "used">("bought");

  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [postsCursor, setPostsCursor] = useState<string | null>(null);

  // Wallet state
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState(false);

  // Tickets state (for own profile)
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  // Attending events state (for public profile)
  const [attendingEvents, setAttendingEvents] = useState<EventListItem[]>([]);
  const [isLoadingAttending, setIsLoadingAttending] = useState(false);

  // Auth helpers
  const authToken = walletToken || null;
  const useSessionAuth = !walletToken && !!session;
  const walletAddress = publicKey?.toBase58() || null;

  // Fetch current user ID
  useEffect(() => {
    if (session?.user?.id) {
      setCurrentUserId(session.user.id);
    } else if (walletToken) {
      const fetchCurrentUser = async () => {
        try {
          const data = await usersService.getCurrentProfile(walletToken);
          setCurrentUserId(data.id);
        } catch (error) {
          console.error("Failed to fetch current user:", error);
        }
      };
      fetchCurrentUser();
    } else {
      setCurrentUserId(null);
    }
  }, [session, walletToken]);

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const data = await usersService.getProfile(userId, authToken);
        setProfile(data);
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [userId, authToken]);

  // Load wallet balance
  const loadBalance = useCallback(async () => {
    if (!publicKey || !connection) {
      setWalletBalance(null);
      return;
    }

    try {
      setIsLoadingBalance(true);
      const balance = await connection.getBalance(publicKey);
      setWalletBalance(balance / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error("Error loading balance:", error);
      setWalletBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [publicKey, connection]);

  // Load balance when wallet connects (only for own profile)
  useEffect(() => {
    if (profile?.isOwnProfile && connected && publicKey) {
      loadBalance();
    } else {
      setWalletBalance(null);
    }
  }, [profile?.isOwnProfile, connected, publicKey, loadBalance]);

  // Load tickets (only for own profile)
  useEffect(() => {
    const loadTickets = async () => {
      if (!profile?.isOwnProfile || !walletAddress) {
        setTickets([]);
        return;
      }

      try {
        setIsLoadingTickets(true);
        const data = await usersService.getTickets(walletAddress);
        setTickets(data.success ? data.tickets : []);
      } catch (error) {
        console.error("Error loading tickets:", error);
        setTickets([]);
      } finally {
        setIsLoadingTickets(false);
      }
    };

    loadTickets();
  }, [profile?.isOwnProfile, walletAddress]);

  // Load attending events (for public profile view)
  useEffect(() => {
    const loadAttendingEvents = async () => {
      if (profile?.isOwnProfile || !userId) {
        setAttendingEvents([]);
        return;
      }

      try {
        setIsLoadingAttending(true);
        const data = await usersService.getAttendingEvents(userId);
        setAttendingEvents(data.events || []);
      } catch (error) {
        console.error("Error loading attending events:", error);
        setAttendingEvents([]);
      } finally {
        setIsLoadingAttending(false);
      }
    };

    loadAttendingEvents();
  }, [profile?.isOwnProfile, userId]);

  // Fetch posts
  const fetchPosts = useCallback(
    async (loadMore = false) => {
      if (!loadMore) {
        setIsLoadingPosts(true);
      }

      try {
        const data = await usersService.getPosts(userId, {
          cursor: loadMore ? postsCursor : null,
          limit: 20,
          authToken,
        });

        if (loadMore) {
          setPosts((prev) => [...prev, ...data.posts]);
        } else {
          setPosts(data.posts);
        }
        setHasMorePosts(data.hasMore);
        setPostsCursor(data.nextCursor ?? null);
      } catch (error) {
        console.error("Failed to fetch posts:", error);
      } finally {
        setIsLoadingPosts(false);
      }
    },
    [userId, authToken, postsCursor]
  );

  useEffect(() => {
    fetchPosts();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handlers
  const handleFollowChange = (isFollowing: boolean, followersCount: number) => {
    setProfile((prev) =>
      prev ? { ...prev, isFollowing, followersCount } : null
    );
  };

  const handlePostDelete = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setProfile((prev) =>
      prev ? { ...prev, postsCount: prev.postsCount - 1 } : null
    );
  };

  const handlePostCreated = () => {
    setPostsCursor(null);
    fetchPosts();
    setProfile((prev) =>
      prev ? { ...prev, postsCount: prev.postsCount + 1 } : null
    );
  };

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Calculate tickets count
  const totalTickets = tickets.filter((t) =>
    ["bought", "on_resale", "nft"].includes(t.status)
  ).length;

  // Check if user can create events
  const userCanCreateEvents =
    session?.user?.role === "ADMIN" ||
    (session?.user?.role === "ORGANIZER" &&
      session?.user?.organizerStatus === "APPROVED");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Пользователь не найден
          </h2>
          <Link href="/feed" className="text-purple-600 hover:underline">
            Вернуться в ленту
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <ProfileHeader name={profile.name} isOwnProfile={profile.isOwnProfile} />

      {/* Profile Info */}
      <div className="w-full px-4 py-6">
        <ProfileCard
          profile={profile}
          userId={userId}
          authToken={authToken}
          useSessionAuth={useSessionAuth}
          ticketsCount={totalTickets}
          attendingCount={attendingEvents.length}
          canCreateEvents={userCanCreateEvents}
          onFollowChange={handleFollowChange}
        />

        {/* Wallet Section - Only for own profile */}
        {profile.isOwnProfile && (
          <div className="mt-4">
            <WalletSection
              connected={connected}
              walletAddress={walletAddress}
              balance={walletBalance}
              isLoadingBalance={isLoadingBalance}
              showBalance={showBalance}
              copied={copied}
              onCopyAddress={handleCopyAddress}
              onToggleBalance={() => setShowBalance(!showBalance)}
              onRefreshBalance={loadBalance}
            />
          </div>
        )}
      </div>

      {/* Content Tabs */}
      <div className="w-full px-4">
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOwnProfile={profile.isOwnProfile}
        />

        {/* Posts Tab */}
        {activeTab === "posts" && (
          <PostsList
            posts={posts}
            isLoading={isLoadingPosts}
            hasMore={hasMorePosts}
            profile={profile}
            authToken={authToken}
            currentUserId={currentUserId}
            useSessionAuth={useSessionAuth}
            onLoadMore={() => fetchPosts(true)}
            onPostCreated={handlePostCreated}
            onPostDelete={handlePostDelete}
          />
        )}

        {/* Tickets Tab - Own Profile */}
        {activeTab === "tickets" && profile.isOwnProfile && (
          <div className="space-y-4">
            <TicketTabs activeTab={ticketsTab} onTabChange={setTicketsTab} />
            <TicketsList
              tickets={tickets}
              isLoading={isLoadingTickets}
              activeTab={ticketsTab}
            />
          </div>
        )}

        {/* Attending Events - Public Profile */}
        {activeTab === "tickets" && !profile.isOwnProfile && (
          <AttendingEvents
            events={attendingEvents}
            isLoading={isLoadingAttending}
          />
        )}
      </div>
    </div>
  );
}
