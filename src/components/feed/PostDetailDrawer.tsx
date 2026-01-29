"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Share2,
  X,
  Send,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Post, Comment } from "./types";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import EventBadge from "./EventBadge";

interface PostDetailDrawerProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  authToken: string | null;
  onLike?: (postId: string, isLiked: boolean, likesCount: number) => void;
  currentUserId?: string | null;
  useSession?: boolean;
}

const PostDetailDrawer: React.FC<PostDetailDrawerProps> = ({
  post,
  isOpen,
  onClose,
  authToken,
  onLike,
  currentUserId,
  useSession = false,
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const isAuthenticated = !!authToken || useSession;

  // Reset state when post changes
  useEffect(() => {
    if (post) {
      setIsLiked(post.isLiked);
      setLikesCount(post.likesCount);
      setComments([]);
      setCursor(null);
      setHasMore(false);
      setSelectedImageIndex(null);
    }
  }, [post?.id]);

  // Fetch comments when drawer opens
  const fetchComments = useCallback(async (loadMore = false) => {
    if (!post) return;

    setIsLoadingComments(true);
    try {
      const url = new URL(`/api/feed/posts/${post.id}/comments`, window.location.origin);
      if (loadMore && cursor) {
        url.searchParams.set("cursor", cursor);
      }

      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        if (loadMore) {
          setComments((prev) => [...prev, ...data.comments]);
        } else {
          setComments(data.comments);
        }
        setHasMore(data.hasMore);
        setCursor(data.nextCursor);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setIsLoadingComments(false);
    }
  }, [post?.id, cursor]);

  useEffect(() => {
    if (isOpen && post) {
      fetchComments();
    }
  }, [isOpen, post?.id]);

  const handleLike = async () => {
    if (!isAuthenticated || isLiking || !post) return;

    setIsLiking(true);
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
        setIsLiked(!newIsLiked);
        setLikesCount(isLiked ? likesCount : likesCount);
      }
    } catch {
      setIsLiked(!newIsLiked);
      setLikesCount(isLiked ? likesCount : likesCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !newComment.trim() || isSubmitting || !post) return;

    setIsSubmitting(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/feed/posts/${post.id}/comments`, {
        method: "POST",
        headers,
        credentials: useSession ? "include" : "same-origin",
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (response.ok) {
        const comment = await response.json();
        setComments((prev) => [comment, ...prev]);
        setNewComment("");
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!post) return;
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
    }
  };

  const getPostTypeLabel = () => {
    if (!post) return null;
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

  if (!post) return null;

  return (
    <>
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[95vh] h-[95vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button
              onClick={onClose}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <DrawerHeader className="p-0 flex-1 text-center">
              <DrawerTitle className="text-base font-semibold">Пост</DrawerTitle>
            </DrawerHeader>
            <button
              onClick={handleShare}
              className="p-2 -mr-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Author Info */}
            <div className="p-4 pb-3">
              <Link
                href={`/profile/${post.author.id}`}
                className="flex items-center gap-3"
                onClick={onClose}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  {post.author.avatar ? (
                    <Image
                      src={post.author.avatar}
                      alt={post.author.name || "User"}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold">
                      {(post.author.name || "U")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                    {post.author.name || "Аноним"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(post.createdAt), {
                      addSuffix: true,
                      locale: ru,
                    })}
                  </p>
                </div>
              </Link>

              {/* Type label */}
              {typeLabel && (
                <div className="mt-3">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${post.type === "TICKET_PURCHASE"
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
              <div className="px-4 pb-4">
                <p className="text-gray-800 text-lg whitespace-pre-wrap break-words leading-relaxed">
                  {post.content}
                </p>
              </div>
            )}

            {/* Event Badge */}
            {post.event && (
              <div className="px-4 pb-4">
                <EventBadge
                  event={post.event}
                  poapProofTx={post.poapProofTx}
                  postType={post.type}
                />
              </div>
            )}

            {/* Images */}
            {post.images.length > 0 && (
              <div className="px-4 pb-4">
                <div className={`grid gap-2 ${post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                  {post.images.map((image, index) => (
                    <motion.div
                      key={index}
                      className={`relative cursor-pointer rounded-xl overflow-hidden ${post.images.length === 3 && index === 0 ? "col-span-2" : ""
                        }`}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedImageIndex(index)}
                    >
                      <Image
                        src={image}
                        alt={`Image ${index + 1}`}
                        width={600}
                        height={400}
                        className="w-full h-52 object-cover"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="px-4 py-4 flex items-center gap-6 border-t border-b border-gray-100">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleLike}
                disabled={!isAuthenticated}
                className={`flex items-center gap-2 ${isLiked ? "text-red-500" : "text-gray-500"
                  } hover:text-red-500 transition-colors disabled:opacity-50`}
              >
                <Heart className={`w-6 h-6 ${isLiked ? "fill-current" : ""}`} />
                <span className="font-medium">{likesCount}</span>
              </motion.button>

              <div className="flex items-center gap-2 text-gray-500">
                <MessageCircle className="w-6 h-6" />
                <span className="font-medium">{comments.length}</span>
              </div>
            </div>

            {/* Comments Section */}
            <div className="pb-20">
              <h3 className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Комментарии
              </h3>

              {isLoadingComments && comments.length === 0 ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                </div>
              ) : comments.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p>Пока нет комментариев</p>
                  <p className="text-sm">Будьте первым!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {comments.map((comment) => (
                    <div key={comment.id} className="px-4 py-3">
                      <div className="flex gap-3">
                        <Link href={`/profile/${comment.author.id}`} onClick={onClose}>
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
                            {comment.author.avatar ? (
                              <Image
                                src={comment.author.avatar}
                                alt={comment.author.name || "User"}
                                width={36}
                                height={36}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white font-semibold text-sm">
                                {(comment.author.name || "U")[0].toUpperCase()}
                              </span>
                            )}
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/profile/${comment.author.id}`}
                              onClick={onClose}
                              className="font-semibold text-sm text-gray-900 hover:text-blue-600"
                            >
                              {comment.author.name || "Аноним"}
                            </Link>
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(comment.createdAt), {
                                addSuffix: true,
                                locale: ru,
                              })}
                            </span>
                          </div>
                          <p className="text-gray-700 mt-1 break-words">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {hasMore && (
                    <button
                      onClick={() => fetchComments(true)}
                      disabled={isLoadingComments}
                      className="w-full p-4 text-sm text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-50"
                    >
                      {isLoadingComments ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        "Загрузить ещё"
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Comment Input - Fixed at bottom */}
          {isAuthenticated && (
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <form onSubmit={handleSubmitComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Написать комментарий..."
                  className="flex-1 px-4 py-3 bg-gray-100 border-0 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  maxLength={1000}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={!newComment.trim() || isSubmitting}
                  className="p-3 bg-purple-500 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </motion.button>
              </form>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* Image Gallery Modal */}
      <AnimatePresence>
        {selectedImageIndex !== null && post.images.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[60] flex items-center justify-center"
            onClick={() => setSelectedImageIndex(null)}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedImageIndex(null)}
              className="absolute top-4 right-4 z-10 p-2 text-white/80 hover:text-white bg-black/20 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navigation - Previous */}
            {post.images.length > 1 && selectedImageIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex(selectedImageIndex - 1);
                }}
                className="absolute left-4 z-10 p-2 text-white/80 hover:text-white bg-black/20 rounded-full"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Navigation - Next */}
            {post.images.length > 1 && selectedImageIndex < post.images.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex(selectedImageIndex + 1);
                }}
                className="absolute right-4 z-10 p-2 text-white/80 hover:text-white bg-black/20 rounded-full"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Image */}
            <motion.img
              key={selectedImageIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={post.images[selectedImageIndex]}
              alt="Full size"
              className="max-w-full max-h-full object-contain p-4"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Image counter */}
            {post.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-white text-sm">
                {selectedImageIndex + 1} / {post.images.length}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PostDetailDrawer;
