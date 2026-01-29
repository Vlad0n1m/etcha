"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, ExternalLink, Trash2, MoreHorizontal } from "lucide-react";
import { Post } from "./types";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import EventBadge from "./EventBadge";
import CommentSection from "./CommentSection";

interface PostCardProps {
  post: Post;
  authToken: string | null;
  onLike?: (postId: string, isLiked: boolean, likesCount: number) => void;
  onDelete?: (postId: string) => void;
  currentUserId?: string | null;
  useSession?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  authToken,
  onLike,
  onDelete,
  currentUserId,
  useSession = false,
}) => {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [isLiking, setIsLiking] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const isOwnPost = currentUserId === post.author.id;

  const isAuthenticated = !!authToken || useSession;

  const handleLike = async () => {
    if (!isAuthenticated || isLiking) return;

    setIsLiking(true);
    // Optimistic update
    const newIsLiked = !isLiked;
    const newLikesCount = newIsLiked ? likesCount + 1 : likesCount - 1;
    setIsLiked(newIsLiked);
    setLikesCount(newLikesCount);

    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/feed/posts/${post.id}/like`, {
        method: "POST",
        headers,
        credentials: useSession ? "include" : "same-origin",
      });

      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.isLiked);
        setLikesCount(data.likesCount);
        onLike?.(post.id, data.isLiked, data.likesCount);
      } else {
        // Revert optimistic update
        setIsLiked(!newIsLiked);
        setLikesCount(isLiked ? likesCount : likesCount);
      }
    } catch {
      // Revert optimistic update
      setIsLiked(!newIsLiked);
      setLikesCount(isLiked ? likesCount : likesCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!isAuthenticated || !isOwnPost) return;

    if (!confirm("Удалить этот пост?")) return;

    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/feed/posts/${post.id}`, {
        method: "DELETE",
        headers,
        credentials: useSession ? "include" : "same-origin",
      });

      if (response.ok) {
        onDelete?.(post.id);
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/feed/post/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.content || "Пост в Etcha",
          url,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(url);
      // Could add a toast notification here
    }
  };

  const getPostTypeLabel = () => {
    switch (post.type) {
      case "TICKET_PURCHASE":
        return "Иду на ивент!";
      case "ATTENDANCE":
        return "Был на ивенте";
      default:
        return null;
    }
  };

  const typeLabel = getPostTypeLabel();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <Link href={`/profile/${post.author.id}`} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              {post.author.avatar ? (
                <Image
                  src={post.author.avatar}
                  alt={post.author.name || "User"}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold text-sm">
                  {(post.author.name || "U")[0].toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                {post.author.name || "Аноним"}
              </p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                  locale: ru,
                })}
              </p>
            </div>
          </Link>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[150px]"
                >
                  <button
                    onClick={handleShare}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Поделиться
                  </button>
                  {isOwnPost && (
                    <button
                      onClick={handleDelete}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                      Удалить
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Type label */}
        {typeLabel && (
          <div className="mt-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${post.type === "TICKET_PURCHASE"
                ? "bg-green-100 text-green-700"
                : "bg-purple-100 text-purple-700"
                }`}
            >
              {post.type === "ATTENDANCE" && post.poapProofTx && (
                <span className="w-2 h-2 bg-current rounded-full animate-pulse" />
              )}
              {typeLabel}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-gray-800 whitespace-pre-wrap break-words">{post.content}</p>
        </div>
      )}

      {/* Event Badge */}
      {post.event && (
        <div className="px-4 pb-3">
          <EventBadge
            event={post.event}
            poapProofTx={post.poapProofTx}
            postType={post.type}
          />
        </div>
      )}

      {/* Images */}
      {post.images.length > 0 && (
        <div className={`grid gap-1 ${post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {post.images.slice(0, 4).map((image, index) => (
            <motion.div
              key={index}
              className={`relative cursor-pointer ${post.images.length === 3 && index === 0 ? "col-span-2" : ""
                }`}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedImage(image)}
            >
              <Image
                src={image}
                alt={`Image ${index + 1}`}
                width={600}
                height={400}
                className="w-full h-48 object-cover"
              />
              {post.images.length > 4 && index === 3 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-xl font-bold">+{post.images.length - 4}</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 flex items-center gap-6 border-t border-gray-100">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleLike}
          disabled={!isAuthenticated}
          className={`flex items-center gap-2 ${isLiked ? "text-red-500" : "text-gray-500"
            } hover:text-red-500 transition-colors disabled:opacity-50`}
        >
          <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
          <span className="text-sm font-medium">{likesCount}</span>
        </motion.button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{commentsCount}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 text-gray-500 hover:text-green-500 transition-colors ml-auto"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <CommentSection
              postId={post.id}
              authToken={authToken}
              onCommentAdded={() => setCommentsCount((c) => c + 1)}
              useSession={useSession}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={selectedImage}
              alt="Full size"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white text-2xl"
            >
              &times;
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PostCard;
