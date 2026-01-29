"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Calendar, Users } from "lucide-react";
import { PostCard, FollowButton, Post, UserProfile } from "@/components/feed";
import { useAuth } from "@/components/AuthProvider";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UserProfilePage({ params }: PageProps) {
  const { id: userId } = use(params);
  const { token } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [postsCursor, setPostsCursor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "followers" | "following">("posts");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch current user ID
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!token) return;
      try {
        const response = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
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
  }, [token]);

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
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
  }, [userId, token]);

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
        if (token) {
          headers.Authorization = `Bearer ${token}`;
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
    [userId, token, postsCursor]
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
        <div className="w-full px-4 py-3 flex items-center gap-3">
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
                authToken={token}
                onFollowChange={handleFollowChange}
              />
            )}
          </div>

          {/* Name and Bio */}
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {profile.name || "Аноним"}
          </h2>

          {profile.walletAddress && (
            <p className="text-sm text-gray-500 font-mono mb-3">
              {profile.walletAddress.slice(0, 4)}...{profile.walletAddress.slice(-4)}
            </p>
          )}

          {profile.bio && (
            <p className="text-gray-700 mb-4">{profile.bio}</p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm">
            <button
              onClick={() => setActiveTab("posts")}
              className={`flex items-center gap-1 ${activeTab === "posts" ? "text-purple-600 font-semibold" : "text-gray-500"
                }`}
            >
              <span className="font-bold text-gray-900">{profile.postsCount}</span>
              <span>постов</span>
            </button>
            <button
              onClick={() => setActiveTab("followers")}
              className={`flex items-center gap-1 ${activeTab === "followers" ? "text-purple-600 font-semibold" : "text-gray-500"
                }`}
            >
              <span className="font-bold text-gray-900">{profile.followersCount}</span>
              <span>подписчиков</span>
            </button>
            <button
              onClick={() => setActiveTab("following")}
              className={`flex items-center gap-1 ${activeTab === "following" ? "text-purple-600 font-semibold" : "text-gray-500"
                }`}
            >
              <span className="font-bold text-gray-900">{profile.followingCount}</span>
              <span>подписок</span>
            </button>
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
      </div>

      {/* Content Tabs */}
      <div className="w-full px-4">
        {activeTab === "posts" && (
          <div className="space-y-4">
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
                      authToken={token}
                      currentUserId={currentUserId}
                      onDelete={handlePostDelete}
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

        {(activeTab === "followers" || activeTab === "following") && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {activeTab === "followers" ? "Список подписчиков" : "Список подписок"}
            </p>
            <p className="text-sm text-gray-400 mt-1">Скоро</p>
          </div>
        )}
      </div>
    </div>
  );
}
