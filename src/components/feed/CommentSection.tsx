"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import { Comment } from "./types";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface CommentSectionProps {
  postId: string;
  authToken: string | null;
  onCommentAdded?: () => void;
  useSession?: boolean;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  authToken,
  onCommentAdded,
  useSession = false,
}) => {
  const isAuthenticated = !!authToken || useSession;
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  const fetchComments = useCallback(async (loadMore = false) => {
    try {
      const url = new URL(`/api/feed/posts/${postId}/comments`, window.location.origin);
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
      setIsLoading(false);
    }
  }, [postId, cursor]);

  useEffect(() => {
    fetchComments();
  }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/feed/posts/${postId}/comments`, {
        method: "POST",
        headers,
        credentials: useSession ? "include" : "same-origin",
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (response.ok) {
        const comment = await response.json();
        setComments((prev) => [comment, ...prev]);
        setNewComment("");
        onCommentAdded?.();
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-t border-gray-100 bg-gray-50">
      {/* Comment Input */}
      {isAuthenticated && (
        <form onSubmit={handleSubmit} className="p-4 border-b border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Написать комментарий..."
              className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              maxLength={1000}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="p-2 bg-purple-500 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </form>
      )}

      {/* Comments List */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          </div>
        ) : comments.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            Пока нет комментариев
          </div>
        ) : (
          <AnimatePresence>
            {comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="px-4 py-3 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex gap-3">
                  <Link href={`/profile/${comment.author.id}`}>
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
                      {comment.author.avatar ? (
                        <Image
                          src={comment.author.avatar}
                          alt={comment.author.name || "User"}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-semibold text-xs">
                          {(comment.author.name || "U")[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/profile/${comment.author.id}`}
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
                    <p className="text-sm text-gray-700 mt-0.5 break-words">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Load More */}
        {hasMore && !isLoading && (
          <button
            onClick={() => fetchComments(true)}
            className="w-full p-3 text-sm text-purple-600 hover:bg-purple-50 transition-colors"
          >
            Загрузить ещё
          </button>
        )}
      </div>
    </div>
  );
};

export default CommentSection;
