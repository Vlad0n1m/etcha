"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowUp } from "lucide-react";
import { PostCard, PostComposer, Post } from "@/components/feed";
import PostDetailDrawer from "@/components/feed/PostDetailDrawer";
import { useAuth } from "@/components/AuthProvider";
import { useSession } from "next-auth/react";

type FeedTab = "all" | "following";

export default function FeedPage() {
  const { token: walletToken } = useAuth();
  const { data: session, status: sessionStatus } = useSession();
  const [activeTab, setActiveTab] = useState<FeedTab>("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{
    avatar: string | null;
    name: string | null;
  } | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Check if user is authenticated (either via wallet or NextAuth session)
  const isAuthenticated = !!walletToken || !!session?.user;
  const authToken = walletToken || null; // For API calls that need wallet token

  // Fetch current user profile from session or wallet
  useEffect(() => {
    if (session?.user) {
      // Use NextAuth session data
      setCurrentUserId(session.user.id);
      setUserProfile({
        avatar: session.user.image || null,
        name: session.user.name || null,
      });
    } else if (walletToken) {
      // Fallback to wallet token profile fetch
      const fetchProfile = async () => {
        try {
          const response = await fetch("/api/profile", {
            headers: { Authorization: `Bearer ${walletToken}` },
          });
          if (response.ok) {
            const data = await response.json();
            setCurrentUserId(data.id);
            setUserProfile({
              avatar: data.profile?.avatar || null,
              name: data.profile?.nickname || null,
            });
          }
        } catch (error) {
          console.error("Failed to fetch profile:", error);
        }
      };
      fetchProfile();
    } else {
      setCurrentUserId(null);
      setUserProfile(null);
    }
  }, [session, walletToken]);

  // Fetch posts
  const fetchPosts = useCallback(
    async (loadMore = false, refresh = false) => {
      if (!loadMore) {
        setIsLoading(true);
      }
      if (refresh) {
        setIsRefreshing(true);
      }

      try {
        const url = new URL("/api/feed", window.location.origin);
        url.searchParams.set("tab", activeTab);
        url.searchParams.set("limit", "20");
        if (loadMore && cursor) {
          url.searchParams.set("cursor", cursor);
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
          setHasMore(data.hasMore);
          setCursor(data.nextCursor);
        }
      } catch (error) {
        console.error("Failed to fetch posts:", error);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeTab, cursor, walletToken]
  );

  // Initial fetch and tab change
  useEffect(() => {
    setCursor(null);
    fetchPosts();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchPosts(true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePostCreated = () => {
    // Refresh feed to show new post
    setCursor(null);
    fetchPosts(false, true);
  };

  const handlePostDelete = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleLikeUpdate = (postId: string, isLiked: boolean, likesCount: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, isLiked, likesCount } : p
      )
    );
  };

  const handleOpenDetail = (post: Post) => {
    setSelectedPost(post);
  };

  const handleRefresh = () => {
    setCursor(null);
    fetchPosts(false, true);
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="sticky top-[30px] lg:top-[60px] z-10 bg-white py-3 px-4">
        <div className="w-full">
          {/* Tabs */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-full">
            <button
              onClick={() => setActiveTab("all")}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-full transition-all ${activeTab === "all"
                ? "bg-white text-purple-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Все
            </button>
            <button
              onClick={() => setActiveTab("following")}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-full transition-all ${activeTab === "following"
                ? "bg-white text-purple-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Подписки
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 py-4 space-y-4">
        {/* Post Composer - show for authenticated users */}
        {isAuthenticated && userProfile && (
          <PostComposer
            authToken={authToken}
            userAvatar={userProfile.avatar}
            userName={userProfile.name}
            onPostCreated={handlePostCreated}
            useSession={!walletToken && !!session}
          />
        )}

        {/* Posts */}
        {isLoading && posts.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab === "following" ? "Нет постов от подписок" : "Пока нет постов"}
            </h3>
            <p className="text-gray-500">
              {activeTab === "following"
                ? "Подпишитесь на других пользователей, чтобы видеть их посты"
                : "Станьте первым, кто напишет пост!"}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                authToken={authToken}
                currentUserId={currentUserId}
                onDelete={handlePostDelete}
                onLike={handleLikeUpdate}
                onOpenDetail={handleOpenDetail}
                useSession={!walletToken && !!session}
              />
            ))}
          </AnimatePresence>
        )}

        {/* Load More Trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-24 right-4 lg:right-8 w-12 h-12 bg-purple-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-purple-600 transition-colors z-20"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Post Detail Drawer */}
      <PostDetailDrawer
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        authToken={authToken}
        onLike={handleLikeUpdate}
        currentUserId={currentUserId}
        useSession={!walletToken && !!session}
      />
    </div>
  );
}
