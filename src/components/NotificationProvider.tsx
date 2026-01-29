"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Toaster, toast } from "sonner";
import { useSession } from "next-auth/react";
import { Heart, UserPlus, MessageCircle, FileText } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export interface NotificationData {
  id: string;
  userId: string;
  actorId: string;
  type: "LIKE" | "COMMENT" | "FOLLOW" | "NEW_POST";
  postId?: string | null;
  commentId?: string | null;
  isRead: boolean;
  createdAt: string;
  actor: {
    id: string;
    name: string | null;
    image: string | null;
    profile?: {
      nickname: string | null;
      avatar: string | null;
    } | null;
  };
}

interface SSEMessage {
  type: "connected" | "new_notification" | "unread_count";
  unreadCount?: number;
  notification?: NotificationData;
}

interface NotificationContextType {
  unreadCount: number;
  notifications: NotificationData[];
  isLoading: boolean;
  isConnected: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (ids: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}

// Hook for components that might not be inside NotificationProvider
export function useNotificationsSafe() {
  const context = useContext(NotificationContext);
  return context;
}

const NOTIFICATION_ICONS = {
  LIKE: Heart,
  COMMENT: MessageCircle,
  FOLLOW: UserPlus,
  NEW_POST: FileText,
};

const NOTIFICATION_COLORS = {
  LIKE: "text-red-500",
  COMMENT: "text-blue-500",
  FOLLOW: "text-purple-500",
  NEW_POST: "text-green-500",
};

function getNotificationMessage(notification: NotificationData): string {
  const actorName = notification.actor.profile?.nickname || notification.actor.name || "Someone";

  switch (notification.type) {
    case "LIKE":
      return `${actorName} liked your post`;
    case "COMMENT":
      return `${actorName} commented on your post`;
    case "FOLLOW":
      return `${actorName} started following you`;
    case "NEW_POST":
      return `${actorName} posted something new`;
    default:
      return "New notification";
  }
}

function getNotificationLink(notification: NotificationData): string {
  switch (notification.type) {
    case "LIKE":
    case "COMMENT":
    case "NEW_POST":
      return notification.postId ? `/feed?postId=${notification.postId}` : "/feed";
    case "FOLLOW":
      return `/profile/${notification.actorId}`;
    default:
      return "/notifications";
  }
}

function NotificationToast({ notification }: { notification: NotificationData }) {
  const Icon = NOTIFICATION_ICONS[notification.type];
  const colorClass = NOTIFICATION_COLORS[notification.type];
  const actorName = notification.actor.profile?.nickname || notification.actor.name || "Someone";
  const actorAvatar = notification.actor.profile?.avatar || notification.actor.image;
  const link = getNotificationLink(notification);

  return (
    <Link href={link} className="flex items-start gap-3 w-full">
      <div className="relative flex-shrink-0">
        {actorAvatar ? (
          <Image
            src={actorAvatar}
            alt={actorName}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
            {actorName[0]?.toUpperCase() || "?"}
          </div>
        )}
        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm ${colorClass}`}>
          <Icon className="w-3 h-3" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {getNotificationMessage(notification)}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          Just now
        </p>
      </div>
    </Link>
  );
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { data: session, status } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastNotificationIdRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Show toast for new notification
  const showNotificationToast = useCallback((notification: NotificationData) => {
    toast.custom(
      (t) => (
        <div
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 max-w-sm w-full cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toast.dismiss(t)}
        >
          <NotificationToast notification={notification} />
        </div>
      ),
      {
        duration: 5000,
        position: typeof window !== "undefined" && window.innerWidth < 1024 ? "top-center" : "bottom-right",
      }
    );
  }, []);

  // Handle SSE message
  const handleSSEMessage = useCallback((event: MessageEvent) => {
    try {
      const data: SSEMessage = JSON.parse(event.data);

      switch (data.type) {
        case "connected":
          setIsConnected(true);
          if (data.unreadCount !== undefined) {
            setUnreadCount(data.unreadCount);
          }
          break;

        case "new_notification":
          if (data.notification) {
            // Add to notifications list
            setNotifications((prev) => [data.notification!, ...prev]);
            // Show toast
            showNotificationToast(data.notification);
            // Update last notification id
            lastNotificationIdRef.current = data.notification.id;
          }
          break;

        case "unread_count":
          if (data.unreadCount !== undefined) {
            setUnreadCount(data.unreadCount);
          }
          break;
      }
    } catch (error) {
      console.error("Error parsing SSE message:", error);
    }
  }, [showNotificationToast]);

  // Connect to SSE
  const connectSSE = useCallback(() => {
    if (!session?.user?.id || eventSourceRef.current) return;

    try {
      const eventSource = new EventSource("/api/notifications/stream");
      eventSourceRef.current = eventSource;

      eventSource.onmessage = handleSSEMessage;

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        eventSourceRef.current = null;

        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectSSE();
        }, 3000);
      };

      eventSource.onopen = () => {
        setIsConnected(true);
      };
    } catch (error) {
      console.error("Error connecting to SSE:", error);
      setIsConnected(false);
    }
  }, [session?.user?.id, handleSSEMessage]);

  // Disconnect SSE
  const disconnectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications?limit=20");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);

        // Set initial last notification id
        if (data.notifications.length > 0 && !lastNotificationIdRef.current) {
          lastNotificationIdRef.current = data.notifications[0].id;
        }
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Polling fallback - check for new notifications
  const checkForNewNotifications = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch("/api/notifications?limit=5&unreadOnly=true");
      if (response.ok) {
        const data = await response.json();

        // Update unread count
        setUnreadCount(data.unreadCount);

        // Show toast for genuinely new notifications
        if (data.notifications.length > 0) {
          const latestNotification = data.notifications[0];

          // Only show toast if this is a NEW notification we haven't seen
          if (lastNotificationIdRef.current &&
            latestNotification.id !== lastNotificationIdRef.current &&
            new Date(latestNotification.createdAt) > new Date(Date.now() - 60000)) { // Within last minute

            // Check if this notification is in our current list
            const isAlreadyInList = notifications.some(n => n.id === latestNotification.id);

            if (!isAlreadyInList) {
              // Add to list and show toast
              setNotifications(prev => [latestNotification, ...prev.filter(n => n.id !== latestNotification.id)]);
              showNotificationToast(latestNotification);
            }
          }

          lastNotificationIdRef.current = latestNotification.id;
        }
      }
    } catch (error) {
      console.error("Error checking for new notifications:", error);
    }
  }, [session?.user?.id, notifications, showNotificationToast]);

  const refreshCount = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch("/api/notifications/count");
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Error fetching notification count:", error);
    }
  }, [session?.user?.id]);

  const markAsRead = useCallback(async (ids: string[]) => {
    if (!session?.user?.id || ids.length === 0) return;

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
        setNotifications((prev) =>
          prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n))
        );
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  }, [session?.user?.id]);

  const markAllAsRead = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });

      if (response.ok) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, [session?.user?.id]);

  // Initial fetch and SSE connection
  useEffect(() => {
    if (session?.user?.id && status === "authenticated") {
      fetchNotifications();
      connectSSE();
    }

    return () => {
      disconnectSSE();
    };
  }, [session?.user?.id, status, fetchNotifications, connectSSE, disconnectSSE]);

  // Polling fallback - runs every 10 seconds when SSE is not connected
  useEffect(() => {
    if (!session?.user?.id || status !== "authenticated") return;

    // Always poll as fallback, even if SSE is connected (SSE might miss messages)
    pollingIntervalRef.current = setInterval(checkForNewNotifications, 10000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [session?.user?.id, status, checkForNewNotifications]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectSSE();
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [disconnectSSE]);

  const value = {
    unreadCount,
    notifications,
    isLoading,
    isConnected,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    refreshCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: "!p-0 !bg-transparent !border-0 !shadow-none",
        }}
        expand={false}
        richColors
        closeButton
      />
    </NotificationContext.Provider>
  );
}
