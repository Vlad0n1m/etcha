// ============================================
// ETCHA - Users Service
// ============================================

import { api, API_ENDPOINTS } from "./api";
import type { UserProfile, Ticket, Post, EventListItem } from "@/types";

// ============================================
// Types
// ============================================

interface UserProfileResponse extends UserProfile {
  isFollowing: boolean;
  followersCount: number;
}

interface FollowResponse {
  isFollowing: boolean;
  followersCount: number;
}

interface UserTicketsResponse {
  success: boolean;
  tickets: Ticket[];
}

interface AttendingEventsResponse {
  events: EventListItem[];
}

// ============================================
// Users Service
// ============================================

export const usersService = {
  /**
   * Get user profile by ID
   */
  async getProfile(
    userId: string,
    authToken?: string | null
  ): Promise<UserProfileResponse> {
    return api.get<UserProfileResponse>(API_ENDPOINTS.USER_DETAIL(userId), {
      authToken,
    });
  },

  /**
   * Get current user's profile (authenticated)
   */
  async getCurrentProfile(authToken: string): Promise<UserProfile> {
    return api.get<UserProfile>(API_ENDPOINTS.PROFILE, { authToken });
  },

  /**
   * Follow/unfollow a user
   */
  async toggleFollow(
    userId: string,
    authToken?: string | null,
    useSession?: boolean
  ): Promise<FollowResponse> {
    return api.post<FollowResponse>(
      API_ENDPOINTS.USER_FOLLOW(userId),
      undefined,
      { authToken, useSessionAuth: useSession }
    );
  },

  /**
   * Get user's tickets (authenticated, own profile only)
   */
  async getTickets(walletAddress: string): Promise<UserTicketsResponse> {
    return api.get<UserTicketsResponse>(API_ENDPOINTS.PROFILE_TICKETS, {
      params: { wallet: walletAddress },
    });
  },

  /**
   * Get events user is attending (public)
   */
  async getAttendingEvents(userId: string): Promise<AttendingEventsResponse> {
    return api.get<AttendingEventsResponse>(API_ENDPOINTS.USER_ATTENDING(userId));
  },

  /**
   * Get user's posts
   */
  async getPosts(
    userId: string,
    options: {
      cursor?: string | null;
      limit?: number;
      authToken?: string | null;
    } = {}
  ): Promise<{ posts: Post[]; hasMore: boolean; nextCursor?: string | null }> {
    const { cursor, limit = 20, authToken } = options;

    return api.get(API_ENDPOINTS.USER_POSTS(userId), {
      params: {
        limit,
        ...(cursor && { cursor }),
      },
      authToken,
    });
  },
};

// ============================================
// Utility Functions
// ============================================

/**
 * Format wallet address for display
 */
export function formatWalletAddress(
  address: string,
  startLength: number = 4,
  endLength: number = 4
): string {
  if (!address) return "";
  if (address.length <= startLength + endLength) return address;
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Get user display name
 */
export function getUserDisplayName(user: { name?: string | null }): string {
  return user.name || "Аноним";
}

/**
 * Get user initials for avatar fallback
 */
export function getUserInitials(name: string | null | undefined): string {
  if (!name) return "U";
  return name.charAt(0).toUpperCase();
}

/**
 * Check if user can perform organizer actions
 */
export function canCreateEvents(user: {
  role?: string;
  organizerStatus?: string;
}): boolean {
  if (user.role === "ADMIN") return true;
  return user.role === "ORGANIZER" && user.organizerStatus === "APPROVED";
}
