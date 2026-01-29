import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";
import { auth } from "@/lib/auth";

// Store active connections by userId
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

/**
 * Add notification to user's stream
 */
export function sendNotificationToUser(userId: string, notification: unknown) {
  const userConnections = connections.get(userId);
  if (userConnections) {
    const data = `data: ${JSON.stringify(notification)}\n\n`;
    const encoder = new TextEncoder();
    for (const controller of userConnections) {
      try {
        controller.enqueue(encoder.encode(data));
      } catch {
        // Connection closed, will be cleaned up
      }
    }
  }
}

/**
 * Send unread count update to user
 */
export function sendUnreadCountToUser(userId: string, unreadCount: number) {
  const userConnections = connections.get(userId);
  if (userConnections) {
    const data = `data: ${JSON.stringify({ type: "unread_count", unreadCount })}\n\n`;
    const encoder = new TextEncoder();
    for (const controller of userConnections) {
      try {
        controller.enqueue(encoder.encode(data));
      } catch {
        // Connection closed
      }
    }
  }
}

/**
 * GET /api/notifications/stream
 * SSE endpoint for real-time notifications
 */
export async function GET(request: NextRequest) {
  let userId: string | null = null;

  // Try NextAuth session first
  const session = await auth();
  if (session?.user?.id) {
    userId = session.user.id;
  }

  // Fallback to JWT token (wallet auth)
  if (!userId) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
          userId: string;
        };
        userId = decoded.userId;
      } catch {
        // Invalid token
      }
    }
  }

  // Also check URL params for token (useful for EventSource which can't set headers)
  if (!userId) {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
          userId: string;
        };
        userId = decoded.userId;
      } catch {
        // Invalid token
      }
    }
  }

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const currentUserId = userId;

  // Get initial unread count
  const unreadCount = await prisma.notification.count({
    where: {
      userId: currentUserId,
      isRead: false,
    },
  });

  const stream = new ReadableStream({
    start(controller) {
      // Add to connections
      if (!connections.has(currentUserId)) {
        connections.set(currentUserId, new Set());
      }
      connections.get(currentUserId)!.add(controller);

      // Send initial unread count
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", unreadCount })}\n\n`)
      );

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        const userConnections = connections.get(currentUserId);
        if (userConnections) {
          userConnections.delete(controller);
          if (userConnections.size === 0) {
            connections.delete(currentUserId);
          }
        }
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
