import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";
import { auth } from "@/lib/auth";

/**
 * GET /api/notifications/count
 * Get unread notification count for the current user
 */
export async function GET(request: NextRequest) {
  try {
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

    if (!userId) {
      return NextResponse.json({ unreadCount: 0 });
    }

    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error("Error fetching notification count:", error);
    return NextResponse.json({ unreadCount: 0 });
  }
}
