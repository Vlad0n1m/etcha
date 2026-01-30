"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowUp } from "lucide-react";

// Components
import { PostCard, PostComposer, Post } from "@/components/feed";
import PostDetailDrawer from "@/components/feed/PostDetailDrawer";

// Hooks & Services
import { useUnifiedAuth } from "@/hooks/useAuth";
import { usePagination, useScrollPosition, useInfiniteScroll } from "@/hooks/usePagination";
import { feedService } from "@/services/feed";
import type { PaginatedResponse } from "@/types";

type FeedTab = "all" | "following";

export default function FeedPage() {
  const {
    user,
    isAuthenticated,
    walletToken,
    useSessionAuth,
    session,
  } = useUnifiedAuth();

  const [activeTab, setActiveTab] = useState<FeedTab>("all");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [userProfile, setUserProfile] = useState<{
    avatar: string | null;
    name: string | null;
  } | null>(null);

  // Scroll position
  const { showScrollTop, scrollToTop } = useScrollPosition();

  // Fetch function for pagination
  const fetchPosts = useCallback(
    async (cursor: string | null, limit: number): Promise<PaginatedResponse<Post>> => {
      const response = await feedService.getFeed({
        tab: activeTab,
        cursor,
        limit,
        authToken: walletToken,
      });
      return {
        items: response.posts,
        hasMore: response.hasMore,
        nextCursor: response.nextCursor,
      };
    },
    [activeTab, walletToken]
  );

  // Pagination hook
  const {
    items: posts,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refresh,
    setItems: setPosts,
  } = usePagination(fetchPosts, { limit: 20 });

  // Infinite scroll
  const { loadMoreRef } = useInfiniteScroll({
    hasMore,
    isLoading: isLoadingMore,
    onLoadMore: loadMore,
  });

  // Fetch on tab change
  useEffect(() => {
    refresh();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch current user profile
  useEffect(() => {
    if (session?.user) {
      setUserProfile({
        avatar: session.user.image || null,
        name: session.user.name || null,
      });
    } else if (walletToken) {
      const fetchProfile = async () => {
        try {
          const response = await fetch("/api/profile", {
            headers: { Authorization: `Bearer ${walletToken}` },
          });
          if (response.ok) {
            const data = await response.json();
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
      setUserProfile(null);
    }
  }, [session, walletToken]);

  // Handlers
  const handlePostCreated = () => {
    refresh();
  };

  const handlePostDelete = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleLikeUpdate = (postId: string, isLiked: boolean, likesCount: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isLiked, likesCount } : p))
    );
  };

  const handleOpenDetail = (post: Post) => {
    setSelectedPost(post);
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="sticky top-[30px] lg:top-[60px] z-10 bg-white py-3 px-4">
        <div className="w-full">
          {/* Tabs */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-full">
            <TabButton
              active={activeTab === "all"}
              onClick={() => setActiveTab("all")}
            >
              Все
            </TabButton>
            <TabButton
              active={activeTab === "following"}
              onClick={() => setActiveTab("following")}
            >
              Подписки
            </TabButton>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 py-4 space-y-4">
        {/* Post Composer */}
        {isAuthenticated && userProfile && (
          <PostComposer
            authToken={walletToken}
            userAvatar={userProfile.avatar}
            userName={userProfile.name}
            onPostCreated={handlePostCreated}
            useSession={useSessionAuth}
          />
        )}

        {/* Posts */}
        {isLoading && posts.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          <AnimatePresence mode="popLayout">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                authToken={walletToken}
                currentUserId={user?.id || null}
                onDelete={handlePostDelete}
                onLike={handleLikeUpdate}
                onOpenDetail={handleOpenDetail}
                useSession={useSessionAuth}
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
        authToken={walletToken}
        onLike={handleLikeUpdate}
        currentUserId={user?.id || null}
        useSession={useSessionAuth}
      />
    </div>
  );
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 px-4 text-sm font-medium rounded-full transition-all ${active
          ? "bg-white text-purple-600 shadow-sm"
          : "text-gray-500 hover:text-gray-700"
        }`}
    >
      {children}
    </button>
  );
}

// Empty State Component
function EmptyState({ tab }: { tab: FeedTab }) {
  return (
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
        {tab === "following" ? "Нет постов от подписок" : "Пока нет постов"}
      </h3>
      <p className="text-gray-500">
        {tab === "following"
          ? "Подпишитесь на других пользователей, чтобы видеть их посты"
          : "Станьте первым, кто напишет пост!"}
      </p>
    </div>
  );
}
