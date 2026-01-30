// ============================================
// ETCHA - Events Service
// ============================================

import { api, API_ENDPOINTS } from "./api";
import type { Event, EventListItem, CreateEventForm, TicketType, PaginatedResponse } from "@/types";

// ============================================
// Types
// ============================================

interface EventDetailResponse {
  event: Event;
  userTicketCount: number;
}

interface EventCreateResponse {
  success: boolean;
  message: string;
  eventId: string;
  ticketTypes: number;
  totalTickets: number;
  platformTree?: {
    address: string;
    collectionAddress: string;
    available: number;
  };
  warning?: string;
}

interface EventUpgradeResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ============================================
// Events Service
// ============================================

export const eventsService = {
  /**
   * Get list of events with optional category filter
   */
  async getEvents(category?: string): Promise<EventListItem[]> {
    return api.get<EventListItem[]>(API_ENDPOINTS.EVENTS, {
      params: category && category !== "all" ? { category } : undefined,
    });
  },

  /**
   * Get event details by ID
   */
  async getEventById(
    eventId: string,
    authToken?: string | null
  ): Promise<EventDetailResponse> {
    return api.get<EventDetailResponse>(API_ENDPOINTS.EVENT_DETAIL(eventId), {
      authToken,
    });
  },

  /**
   * Create a new event
   */
  async createEvent(
    data: CreateEventForm,
    authToken?: string | null
  ): Promise<EventCreateResponse> {
    return api.post<EventCreateResponse>(API_ENDPOINTS.EVENT_CREATE, data, {
      authToken,
    });
  },

  /**
   * Upgrade event to cNFT
   */
  async upgradeEvent(
    eventId: string,
    authToken?: string | null
  ): Promise<EventUpgradeResponse> {
    return api.post<EventUpgradeResponse>(
      API_ENDPOINTS.EVENT_UPGRADE(eventId),
      undefined,
      { authToken }
    );
  },
};

// ============================================
// Utility Functions
// ============================================

/**
 * Format event price for display
 */
export function formatEventPrice(price: number): string {
  if (price === 0) return "Free";
  if (price >= 1000) return `${(price / 1000).toFixed(1)}k SOL`;
  return `${price} SOL`;
}

/**
 * Format event date for display
 */
export function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Get relative date label (Today, Tomorrow, or formatted date)
 */
export function getRelativeDateLabel(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * Group events by date
 */
export function groupEventsByDate<T extends { date: string; time?: string }>(
  events: T[]
): { date: string; events: T[] }[] {
  const grouped = events.reduce((acc, event) => {
    const date = event.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, T[]>);

  return Object.keys(grouped)
    .sort()
    .map((date) => ({
      date,
      events: grouped[date].sort((a, b) =>
        (a.time || "").localeCompare(b.time || "")
      ),
    }));
}

/**
 * Check if ticket type is sold out
 */
export function isTicketTypeSoldOut(ticketType: TicketType): boolean {
  return ticketType.available <= 0;
}

/**
 * Get available ticket count for user
 */
export function getMaxTicketsForUser(
  event: Event,
  selectedTicketType: TicketType | null,
  userTicketCount: number
): number {
  if (!selectedTicketType) return 0;

  const availableFromType = selectedTicketType.available;

  if (event.maxTicketsPerUser) {
    const remainingLimit = event.maxTicketsPerUser - userTicketCount;
    return Math.min(availableFromType, Math.max(0, remainingLimit));
  }

  return availableFromType;
}

/**
 * Check if user has reached ticket limit
 */
export function hasReachedTicketLimit(
  event: Event,
  userTicketCount: number
): boolean {
  return !!(event.maxTicketsPerUser && userTicketCount >= event.maxTicketsPerUser);
}

/**
 * Check if event supports cNFT purchases
 */
export function supportsCNFT(event: Event): boolean {
  return event.nftType === "cnft" || !!event.merkleTreeAddress;
}
