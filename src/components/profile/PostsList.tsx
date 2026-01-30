"use client";

import { Loader2, Users } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { PostCard, PostComposer, Post } from "@/components/feed";
import type { UserProfile } from "@/types";

interface PostsListProps {
  posts: Post[];
  isLoading: boolean;
  hasMore: boolean;
  profile: UserProfile;
  authToken: string | null;
  currentUserId: string | null;
  useSessionAuth: boolean;
  onLoadMore: () => void;
  onPostCreated: () => void;
  onPostDelete: (postId: string) => void;
}

export function PostsList({
  posts,
  isLoading,
  hasMore,
  profile,
  authToken,
  currentUserId,
  useSessionAuth,
  onLoadMore,
  onPostCreated,
  onPostDelete,
}: PostsListProps) {
  return (
    <div className="space-y-4">
      {/* Post Composer - only for own profile */}
      {profile.isOwnProfile && (
        <PostComposer
          authToken={authToken}
          userAvatar={profile.avatar}
          userName={profile.name}
          onPostCreated={onPostCreated}
          useSession={useSessionAuth}
        />
      )}

      {isLoading ? (
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
                onDelete={onPostDelete}
                useSession={useSessionAuth}
              />
            ))}
          </AnimatePresence>

          {hasMore && (
            <button
              onClick={onLoadMore}
              className="w-full py-3 text-purple-600 text-sm font-medium hover:bg-purple-50 rounded-lg transition-colors"
            >
              Загрузить ещё
            </button>
          )}
        </>
      )}
    </div>
  );
}
