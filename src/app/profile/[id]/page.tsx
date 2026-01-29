"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Calendar, Users, Settings, Wallet, Copy, Eye, EyeOff, RefreshCw, Ticket, Plus, BadgeCheck } from "lucide-react";
import { PostCard, PostComposer, FollowButton, Post, UserProfile } from "@/components/feed";
import { useAuth } from "@/components/AuthProvider";
import { useSession } from "next-auth/react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import WalletDrawer from "@/components/WalletDrawer";
import { Button } from "@/components/ui/button";
import EventCard from "@/components/EventCard";

type TicketStatus = "bought" | "on_resale" | "passed" | "nft";

interface TicketItem {
  id: string;
  nftId: string;
  eventTitle: string;
  eventImage: string;
  description?: string;
  date: string;
  time: string;
  location: string;
  price: number;
  originalPrice: number;
  marketPrice: number;
  status: TicketStatus;
  organizerName?: string;
}

interface AttendingEvent {
  id: string;
  title: string;
  imageUrl: string;
  date: string;
  time: string;
  location: string;
  description?: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UserProfilePage({ params }: PageProps) {
  const { id: userId } = use(params);
  const { token: walletToken } = useAuth();
  const { data: session } = useSession();
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [postsCursor, setPostsCursor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "tickets" | "followers" | "following">("posts");
  const [ticketsTab, setTicketsTab] = useState<"bought" | "on_resale" | "used">("bought");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Wallet state
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState(false);

  // Tickets state (for own profile)
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  // Attending events state (for public profile)
  const [attendingEvents, setAttendingEvents] = useState<AttendingEvent[]>([]);
  const [isLoadingAttending, setIsLoadingAttending] = useState(false);

  // Determine auth method
  const authToken = walletToken || null;
  const useSessionAuth = !walletToken && !!session;
  const walletAddress = publicKey?.toBase58();

  // Fetch current user ID from session or wallet
  useEffect(() => {
    if (session?.user?.id) {
      setCurrentUserId(session.user.id);
    } else if (walletToken) {
      const fetchCurrentUser = async () => {
        try {
          const response = await fetch("/api/profile", {
            headers: { Authorization: `Bearer ${walletToken}` },
          });
          if (response.ok) {
            const data = await response.json();
            setCurrentUserId(data.id);
          }
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
        const headers: Record<string, string> = {};
        if (walletToken) {
          headers.Authorization = `Bearer ${walletToken}`;
        }

        const response = await fetch(`/api/users/${userId}`, { headers });
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [userId, walletToken]);

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
        const response = await fetch(`/api/profile/tickets?wallet=${walletAddress}`);

        if (!response.ok) {
          setTickets([]);
          return;
        }

        const text = await response.text();
        if (!text) {
          setTickets([]);
          return;
        }

        const data = JSON.parse(text);
        if (data.success) {
          setTickets(data.tickets || []);
        } else {
          setTickets([]);
        }
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
        const response = await fetch(`/api/users/${userId}/attending`);

        if (!response.ok) {
          setAttendingEvents([]);
          return;
        }

        const data = await response.json();
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
        const url = new URL(`/api/users/${userId}/posts`, window.location.origin);
        url.searchParams.set("limit", "20");
        if (loadMore && postsCursor) {
          url.searchParams.set("cursor", postsCursor);
        }

        const headers: Record<string, string> = {};
        if (walletToken) {
          headers.Authorization = `Bearer ${walletToken}`;
        }

        const response = await fetch(url.toString(), { headers });
        if (response.ok) {
          const data = await response.json();
          if (loadMore) {
            setPosts((prev) => [...prev, ...data.posts]);
          } else {
            setPosts(data.posts);
          }
          setHasMorePosts(data.hasMore);
          setPostsCursor(data.nextCursor);
        }
      } catch (error) {
        console.error("Failed to fetch posts:", error);
      } finally {
        setIsLoadingPosts(false);
      }
    },
    [userId, walletToken, postsCursor]
  );

  useEffect(() => {
    fetchPosts();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Filter tickets by tab
  const filteredTickets = tickets.filter((ticket) => {
    if (ticketsTab === "bought") return ticket.status === "bought" || ticket.status === "nft";
    if (ticketsTab === "on_resale") return ticket.status === "on_resale";
    if (ticketsTab === "used") return ticket.status === "passed";
    return true;
  });

  // Group tickets by date
  const groupTicketsByDate = (items: TicketItem[]) => {
    const grouped = items.reduce((acc: Record<string, TicketItem[]>, t: TicketItem) => {
      const dateKey = t.date;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(t);
      return acc;
    }, {});
    return Object.keys(grouped)
      .sort()
      .map((date) => ({
        date,
        items: grouped[date].sort((a, b) => (a.time || "").localeCompare(b.time || "")),
      }));
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return "Сегодня";
    if (date.toDateString() === tomorrow.toDateString()) return "Завтра";
    return date.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  };

  const groupedTickets = groupTicketsByDate(filteredTickets);
  const totalTickets = tickets.filter((t) => ["bought", "on_resale", "nft"].includes(t.status)).length;

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
      <div className="sticky top-[30px] lg:top-[60px] z-10 bg-white border-b border-gray-200">
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/feed"
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {profile.name || "Профиль"}
            </h1>
          </div>
          {profile.isOwnProfile && (
            <Link
              href="/settings"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Настройки"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </Link>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="w-full px-4 py-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* Avatar and Follow Button */}
          <div className="flex items-start justify-between mb-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              {profile.avatar ? (
                <Image
                  src={profile.avatar}
                  alt={profile.name || "User"}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-2xl font-bold">
                  {(profile.name || "U")[0].toUpperCase()}
                </span>
              )}
            </div>

            {!profile.isOwnProfile && (
              <FollowButton
                userId={userId}
                isFollowing={profile.isFollowing}
                authToken={authToken}
                onFollowChange={handleFollowChange}
                useSession={useSessionAuth}
              />
            )}
          </div>

          {/* Name and Bio */}
          <div className="flex items-center gap-1.5 mb-1">
            <h2 className="text-xl font-bold text-gray-900">
              {profile.name || "Аноним"}
            </h2>
            {profile.isOrganizer && (
              <BadgeCheck className="w-5 h-5 text-blue-500 shrink-0" />
            )}
          </div>

          {profile.walletAddress && (
            <p className="text-sm text-gray-500 font-mono mb-3">
              {profile.walletAddress.slice(0, 4)}...{profile.walletAddress.slice(-4)}
            </p>
          )}

          {profile.bio && (
            <p className="text-gray-700 mb-4">{profile.bio}</p>
          )}

          {/* Organizer/Admin buttons */}
          {profile.isOwnProfile && session?.user?.role === "ORGANIZER" && session?.user?.organizerStatus === "APPROVED" && (
            <div className="flex items-center gap-2 mb-4">
              <Link
                href="/organizer/events"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                <Calendar className="w-4 h-4" />
                Мои события
              </Link>
              <Link
                href="/organizer/create-event"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Создать
              </Link>
            </div>
          )}

          {profile.isOwnProfile && session?.user?.role === "ADMIN" && (
            <div className="flex items-center gap-2 mb-4">
              <Link
                href="/organizer/events"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                <Calendar className="w-4 h-4" />
                Все события
              </Link>
              <Link
                href="/organizer/create-event"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Создать
              </Link>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-5 text-sm">
            <div className="flex items-center gap-1">
              <span className="font-bold text-gray-900">{profile.postsCount}</span>
              <span className="text-gray-500">постов</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-gray-900">
                {profile.isOwnProfile ? totalTickets : attendingEvents.length}
              </span>
              <span className="text-gray-500">
                {profile.isOwnProfile ? "билетов" : "иду"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-gray-900">{profile.followersCount}</span>
              <span className="text-gray-500">подписчиков</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-gray-900">{profile.followingCount}</span>
              <span className="text-gray-500">подписок</span>
            </div>
          </div>

          {/* Member since */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>
              На платформе{" "}
              {formatDistanceToNow(new Date(profile.createdAt), {
                addSuffix: false,
                locale: ru,
              })}
            </span>
          </div>
        </div>

        {/* Wallet Section - Only for own profile */}
        {profile.isOwnProfile && (
          <div className="mt-4">
            {connected && walletAddress ? (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-gray-600 text-sm font-medium">Кошелёк подключен</span>
                  </div>
                  <button
                    onClick={handleCopyAddress}
                    className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    title={copied ? "Скопировано!" : "Скопировать адрес"}
                  >
                    <Copy className={`w-4 h-4 ${copied ? "text-green-500" : "text-gray-500"}`} />
                  </button>
                </div>
                <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 font-mono mb-3">
                  {formatAddress(walletAddress)}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">Баланс:</span>
                    {isLoadingBalance ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    ) : (
                      <span className="font-semibold text-gray-900">
                        {showBalance ? (walletBalance !== null ? walletBalance.toFixed(4) : "0.0000") : "***"} SOL
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowBalance(!showBalance)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title={showBalance ? "Скрыть баланс" : "Показать баланс"}
                    >
                      {showBalance ? (
                        <EyeOff className="w-4 h-4 text-gray-500" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    <button
                      onClick={loadBalance}
                      disabled={isLoadingBalance}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                      title="Обновить баланс"
                    >
                      <RefreshCw className={`w-4 h-4 text-gray-500 ${isLoadingBalance ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
                <div className="flex items-center gap-3">
                  <Wallet className="w-6 h-6 text-purple-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-900">Подключите Solana кошелёк</p>
                    <p className="text-xs text-purple-600">Для покупки и управления билетами</p>
                  </div>
                  <WalletDrawer>
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Подключить
                    </Button>
                  </WalletDrawer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Tabs */}
      <div className="w-full px-4">
        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl mb-4">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${activeTab === "posts"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Посты
          </button>
          <button
            onClick={() => setActiveTab("tickets")}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${activeTab === "tickets"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            {profile.isOwnProfile ? "Билеты" : "Иду"}
          </button>
        </div>

        {activeTab === "posts" && (
          <div className="space-y-4">
            {/* Post Composer - only for own profile */}
            {profile.isOwnProfile && (
              <PostComposer
                authToken={authToken}
                userAvatar={profile.avatar}
                userName={profile.name}
                onPostCreated={() => {
                  setPostsCursor(null);
                  fetchPosts();
                  setProfile((prev) => prev ? { ...prev, postsCount: prev.postsCount + 1 } : null);
                }}
                useSession={useSessionAuth}
              />
            )}

            {isLoadingPosts ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Пока нет постов</p>
              </div>
            ) : (
              <>
                <AnimatePresence mode="popLayout">
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      authToken={authToken}
                      currentUserId={currentUserId}
                      onDelete={handlePostDelete}
                      useSession={useSessionAuth}
                    />
                  ))}
                </AnimatePresence>

                {hasMorePosts && (
                  <button
                    onClick={() => fetchPosts(true)}
                    className="w-full py-3 text-purple-600 text-sm font-medium hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    Загрузить ещё
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "tickets" && profile.isOwnProfile && (
          <div className="space-y-4">
            {/* Pill Tabs */}
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
              {[
                { key: "bought", label: "Куплено" },
                { key: "on_resale", label: "На продаже" },
                { key: "used", label: "Использовано" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setTicketsTab(tab.key as typeof ticketsTab)}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${ticketsTab === tab.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tickets List */}
            {isLoadingTickets ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : groupedTickets.length > 0 ? (
              <div className="space-y-4">
                {groupedTickets.map((group) => (
                  <div key={group.date}>
                    <div className="flex items-center mb-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3" />
                      <h3 className="text-base font-semibold text-gray-900 capitalize">
                        {formatDateHeader(group.date)}
                      </h3>
                    </div>
                    <div className="space-y-3 pl-5 border-l-2 border-gray-100">
                      {group.items.map((ticket) => (
                        <EventCard
                          key={ticket.id}
                          id={ticket.id}
                          title={ticket.eventTitle}
                          company=""
                          price={ticket.price}
                          date={ticket.date}
                          time={ticket.time}
                          ticketsAvailable={0}
                          imageUrl={ticket.eventImage}
                          category=""
                          organizer={null}
                          href={`/profile/ticket/${ticket.id}`}
                          size="lg"
                          description={ticket.description}
                          badge={
                            ticket.status === "on_resale"
                              ? "на продаже"
                              : ticket.status === "bought" || ticket.status === "nft"
                                ? "куплен"
                                : undefined
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">
                  {ticketsTab === "bought" && "У вас пока нет билетов"}
                  {ticketsTab === "on_resale" && "Нет билетов на продаже"}
                  {ticketsTab === "used" && "Нет использованных билетов"}
                </p>
                {ticketsTab === "bought" && (
                  <Link href="/" className="text-purple-600 text-sm font-medium hover:underline">
                    Смотреть события
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Attending Events - for public profile view */}
        {activeTab === "tickets" && !profile.isOwnProfile && (
          <div className="space-y-4">
            {isLoadingAttending ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : attendingEvents.length > 0 ? (
              <div className="space-y-3">
                {attendingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    id={event.id}
                    title={event.title}
                    company=""
                    price={0}
                    date={event.date}
                    time={event.time}
                    ticketsAvailable={0}
                    imageUrl={event.imageUrl}
                    category=""
                    organizer={null}
                    href={`/event/${event.id}`}
                    size="lg"
                    description={event.description}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Пока не идёт ни на одно событие</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
