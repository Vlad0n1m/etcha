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

interface NotificationContextType {
  unreadCount: number;
  notifications: NotificationData[];
  isLoading: boolean;
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
  const lastNotificationIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications?limit=20");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

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

  const checkForNewNotifications = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch("/api/notifications?limit=5&unreadOnly=true");
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);

        // Show toast for new notifications
        if (data.notifications.length > 0 && isInitializedRef.current) {
          const latestNotification = data.notifications[0];

          // Only show toast if it's a new notification
          if (lastNotificationIdRef.current && latestNotification.id !== lastNotificationIdRef.current) {
            // Check if this notification is newer than the last one we saw
            const isNew = !lastNotificationIdRef.current ||
              new Date(latestNotification.createdAt) > new Date(notifications[0]?.createdAt || 0);

            if (isNew) {
              toast.custom(
                (t) => (
                  <div
                    className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 max-w-sm w-full cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toast.dismiss(t)}
                  >
                    <NotificationToast notification={latestNotification} />
                  </div>
                ),
                {
                  duration: 5000,
                  position: window.innerWidth < 1024 ? "top-center" : "bottom-right",
                }
              );
            }
          }

          lastNotificationIdRef.current = latestNotification.id;
        }
      }
    } catch (error) {
      console.error("Error checking for new notifications:", error);
    }
  }, [session?.user?.id, notifications]);

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

  // Initial fetch
  useEffect(() => {
    if (session?.user?.id && status === "authenticated") {
      fetchNotifications().then(() => {
        isInitializedRef.current = true;
      });
    }
  }, [session?.user?.id, status, fetchNotifications]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!session?.user?.id || status !== "authenticated") return;

    const interval = setInterval(checkForNewNotifications, 30000);
    return () => clearInterval(interval);
  }, [session?.user?.id, status, checkForNewNotifications]);

  const value = {
    unreadCount,
    notifications,
    isLoading,
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
