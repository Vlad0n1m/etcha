import { prisma } from "@/lib/db";
import { NotificationType } from "@/generated/prisma";
import {
  sendNotificationToUser,
  sendUnreadCountToUser,
} from "@/app/api/notifications/stream/route";

/**
 * Create a notification
 * @param userId - User who receives the notification
 * @param actorId - User who triggered the notification
 * @param type - Type of notification
 * @param postId - Related post ID (optional)
 * @param commentId - Related comment ID (optional)
 */
export async function createNotification({
  userId,
  actorId,
  type,
  postId,
  commentId,
}: {
  userId: string;
  actorId: string;
  type: NotificationType;
  postId?: string;
  commentId?: string;
}) {
  // Don't create notification if user is the actor (self-action)
  if (userId === actorId) {
    return null;
  }

  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        actorId,
        type,
        postId,
        commentId,
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            image: true,
            profile: {
              select: {
                nickname: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    // Send real-time notification via SSE
    sendNotificationToUser(userId, {
      type: "new_notification",
      notification,
    });

    // Also update unread count
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    sendUnreadCountToUser(userId, unreadCount);

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

/**
 * Create notifications for all followers when a user posts
 * @param authorId - User who created the post
 * @param postId - The post ID
 */
export async function notifyFollowersOfNewPost(authorId: string, postId: string) {
  try {
    // Get all followers of the author
    const followers = await prisma.follow.findMany({
      where: { followingId: authorId },
      select: { followerId: true },
    });

    if (followers.length === 0) return;

    // Create notifications for all followers
    await prisma.notification.createMany({
      data: followers.map((f) => ({
        userId: f.followerId,
        actorId: authorId,
        type: NotificationType.NEW_POST,
        postId,
      })),
      skipDuplicates: true,
    });
  } catch (error) {
    console.error("Error notifying followers of new post:", error);
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}
