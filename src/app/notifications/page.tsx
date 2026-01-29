"use client";

import { useEffect, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Heart, UserPlus, MessageCircle, FileText, Bell, Check, ChevronLeft, Loader2 } from "lucide-react";
import { useNotifications, NotificationData } from "@/components/NotificationProvider";
import { formatDistanceToNow } from "date-fns";

const NOTIFICATION_ICONS = {
  LIKE: Heart,
  COMMENT: MessageCircle,
  FOLLOW: UserPlus,
  NEW_POST: FileText,
};

const NOTIFICATION_COLORS = {
  LIKE: "text-red-500 bg-red-50",
  COMMENT: "text-blue-500 bg-blue-50",
  FOLLOW: "text-purple-500 bg-purple-50",
  NEW_POST: "text-green-500 bg-green-50",
};

function getNotificationMessage(notification: NotificationData): string {
  const actorName = notification.actor.profile?.nickname || notification.actor.name || "Someone";

  switch (notification.type) {
    case "LIKE":
      return `**${actorName}** liked your post`;
    case "COMMENT":
      return `**${actorName}** commented on your post`;
    case "FOLLOW":
      return `**${actorName}** started following you`;
    case "NEW_POST":
      return `**${actorName}** posted something new`;
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

function renderMessage(message: string) {
  const parts = message.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <span key={i} className="font-semibold">{part.slice(2, -2)}</span>;
    }
    return part;
  });
}

function NotificationItem({
  notification,
  onMarkAsRead
}: {
  notification: NotificationData;
  onMarkAsRead: (id: string) => void;
}) {
  const Icon = NOTIFICATION_ICONS[notification.type];
  const colorClass = NOTIFICATION_COLORS[notification.type];
  const actorName = notification.actor.profile?.nickname || notification.actor.name || "Someone";
  const actorAvatar = notification.actor.profile?.avatar || notification.actor.image;
  const link = getNotificationLink(notification);
  const message = getNotificationMessage(notification);

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <Link
      href={link}
      onClick={handleClick}
      className={`flex items-start gap-3 p-4 transition-colors hover:bg-gray-50 ${!notification.isRead ? "bg-blue-50/50" : ""
        }`}
    >
      <div className="relative flex-shrink-0">
        {actorAvatar ? (
          <Image
            src={actorAvatar}
            alt={actorName}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
            {actorName[0]?.toUpperCase() || "?"}
          </div>
        )}
        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${colorClass}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">
          {renderMessage(message)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>

      {!notification.isRead && (
        <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-blue-500 mt-2" />
      )}
    </Link>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  } = useNotifications();
  const [loadingMore, setLoadingMore] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Fetch notifications on mount
  useEffect(() => {
    if (status === "authenticated") {
      fetchNotifications();
    }
  }, [status, fetchNotifications]);

  const handleMarkAsRead = useCallback((id: string) => {
    markAsRead([id]);
  }, [markAsRead]);

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto">
        {isLoading && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-3" />
            <p className="text-sm text-gray-500">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications yet</h3>
            <p className="text-sm text-gray-500 text-center max-w-xs">
              When someone likes your post, follows you, or comments, you&apos;ll see it here
            </p>
          </div>
        ) : (
          <div className="bg-white divide-y divide-gray-100">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
              />
            ))}

            {loadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom padding for mobile nav */}
      <div className="h-20 lg:h-0" />
    </div>
  );
}
