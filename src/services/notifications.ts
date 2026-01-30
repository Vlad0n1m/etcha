// ============================================
// ETCHA - Notifications Service
// ============================================

import { api, API_ENDPOINTS } from "./api";
import type { Notification } from "@/types";
import { NOTIFICATION_CONFIG, ROUTES } from "@/lib/constants";

// ============================================
// Types
// ============================================

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

interface CountResponse {
  unreadCount: number;
}

interface MarkReadResponse {
  unreadCount: number;
}

// ============================================
// Notifications Service
// ============================================

export const notificationsService = {
  /**
   * Get notifications list
   */
  async getNotifications(
    options: {
      limit?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<NotificationsResponse> {
    const { limit = 20, unreadOnly = false } = options;

    return api.get<NotificationsResponse>(API_ENDPOINTS.NOTIFICATIONS, {
      params: {
        limit,
        ...(unreadOnly && { unreadOnly: true }),
      },
    });
  },

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<CountResponse> {
    return api.get<CountResponse>(API_ENDPOINTS.NOTIFICATIONS_COUNT);
  },

  /**
   * Mark notifications as read
   */
  async markAsRead(ids: string[]): Promise<MarkReadResponse> {
    return api.patch<MarkReadResponse>(API_ENDPOINTS.NOTIFICATIONS, { ids });
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<MarkReadResponse> {
    return api.patch<MarkReadResponse>(API_ENDPOINTS.NOTIFICATIONS, { all: true });
  },
};

// ============================================
// Utility Functions
// ============================================

/**
 * Get notification message
 */
export function getNotificationMessage(notification: Notification): string {
  const actorName =
    notification.actor.profile?.nickname ||
    notification.actor.name ||
    "Someone";

  const config = NOTIFICATION_CONFIG[notification.type];
  return config?.getMessage(actorName) || "New notification";
}

/**
 * Get notification link
 */
export function getNotificationLink(notification: Notification): string {
  switch (notification.type) {
    case "LIKE":
    case "COMMENT":
    case "NEW_POST":
      return notification.postId
        ? `${ROUTES.FEED}?postId=${notification.postId}`
        : ROUTES.FEED;
    case "FOLLOW":
      return ROUTES.PROFILE_USER(notification.actorId);
    default:
      return ROUTES.NOTIFICATIONS;
  }
}

/**
 * Get notification icon name
 */
export function getNotificationIcon(type: Notification["type"]): string {
  return NOTIFICATION_CONFIG[type]?.icon || "Bell";
}

/**
 * Get notification color class
 */
export function getNotificationColorClass(type: Notification["type"]): string {
  return NOTIFICATION_CONFIG[type]?.color || "text-gray-500";
}

/**
 * Get actor display info
 */
export function getActorInfo(notification: Notification) {
  const actor = notification.actor;
  return {
    name: actor.profile?.nickname || actor.name || "Someone",
    avatar: actor.profile?.avatar || actor.image,
    id: actor.id,
  };
}
