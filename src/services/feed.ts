// ============================================
// ETCHA - Feed Service
// ============================================

import { api, API_ENDPOINTS } from "./api";
import type { Post, Comment, CreatePostForm, PaginatedResponse } from "@/types";
import { PAGINATION } from "@/lib/constants";

// ============================================
// Types
// ============================================

type FeedTab = "all" | "following";

interface FeedResponse {
  posts: Post[];
  hasMore: boolean;
  nextCursor?: string | null;
}

interface LikeResponse {
  isLiked: boolean;
  likesCount: number;
}

interface CommentResponse {
  comment: Comment;
  commentsCount: number;
}

// ============================================
// Feed Service
// ============================================

export const feedService = {
  /**
   * Get feed posts
   */
  async getFeed(
    options: {
      tab?: FeedTab;
      cursor?: string | null;
      limit?: number;
      authToken?: string | null;
    } = {}
  ): Promise<FeedResponse> {
    const { tab = "all", cursor, limit = PAGINATION.FEED_LIMIT, authToken } = options;

    return api.get<FeedResponse>(API_ENDPOINTS.FEED, {
      params: {
        tab,
        limit,
        ...(cursor && { cursor }),
      },
      authToken,
    });
  },

  /**
   * Get user's posts
   */
  async getUserPosts(
    userId: string,
    options: {
      cursor?: string | null;
      limit?: number;
      authToken?: string | null;
    } = {}
  ): Promise<FeedResponse> {
    const { cursor, limit = PAGINATION.FEED_LIMIT, authToken } = options;

    return api.get<FeedResponse>(API_ENDPOINTS.USER_POSTS(userId), {
      params: {
        limit,
        ...(cursor && { cursor }),
      },
      authToken,
    });
  },

  /**
   * Create a new post
   */
  async createPost(
    data: CreatePostForm,
    authToken?: string | null,
    useSession?: boolean
  ): Promise<Post> {
    return api.post<Post>("/api/feed/posts", data, {
      authToken,
      useSessionAuth: useSession,
    });
  },

  /**
   * Delete a post
   */
  async deletePost(
    postId: string,
    authToken?: string | null,
    useSession?: boolean
  ): Promise<void> {
    return api.delete(API_ENDPOINTS.FEED_POST(postId), {
      authToken,
      useSessionAuth: useSession,
    });
  },

  /**
   * Like/unlike a post
   */
  async toggleLike(
    postId: string,
    authToken?: string | null,
    useSession?: boolean
  ): Promise<LikeResponse> {
    return api.post<LikeResponse>(
      API_ENDPOINTS.FEED_POST_LIKE(postId),
      undefined,
      { authToken, useSessionAuth: useSession }
    );
  },

  /**
   * Get comments for a post
   */
  async getComments(
    postId: string,
    options: {
      cursor?: string | null;
      limit?: number;
    } = {}
  ): Promise<{ comments: Comment[]; hasMore: boolean; nextCursor?: string }> {
    const { cursor, limit = PAGINATION.COMMENTS_LIMIT } = options;

    return api.get(API_ENDPOINTS.FEED_POST_COMMENTS(postId), {
      params: {
        limit,
        ...(cursor && { cursor }),
      },
    });
  },

  /**
   * Add comment to a post
   */
  async addComment(
    postId: string,
    content: string,
    authToken?: string | null,
    useSession?: boolean
  ): Promise<CommentResponse> {
    return api.post<CommentResponse>(
      API_ENDPOINTS.FEED_POST_COMMENTS(postId),
      { content },
      { authToken, useSessionAuth: useSession }
    );
  },
};

// ============================================
// Utility Functions
// ============================================

/**
 * Get post type label
 */
export function getPostTypeLabel(type: Post["type"]): string | null {
  switch (type) {
    case "TICKET_PURCHASE":
      return "Иду на ивент!";
    case "ATTENDANCE":
      return "Был на ивенте";
    default:
      return null;
  }
}

/**
 * Get post type color classes
 */
export function getPostTypeColorClass(type: Post["type"]): string {
  switch (type) {
    case "TICKET_PURCHASE":
      return "bg-green-100 text-green-700";
    case "ATTENDANCE":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

/**
 * Generate share URL for post
 */
export function getPostShareUrl(postId: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/feed/post/${postId}`;
}
