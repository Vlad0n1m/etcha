import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";
import { auth } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { NotificationType } from "@/generated/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/users/[id]/follow
 * Toggle follow on a user
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: targetUserId } = await params;

    let currentUserId: string | null = null;

    // Try NextAuth session first
    const session = await auth();
    if (session?.user?.id) {
      currentUserId = session.user.id;
    }

    // Fallback to JWT token (wallet auth)
    if (!currentUserId) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
            userId: string;
          };
          currentUserId = decoded.userId;
        } catch {
          // Invalid token
        }
      }
    }

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cannot follow yourself
    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId,
        },
      },
    });

    let isFollowing: boolean;
    let followersCount: number;

    if (existingFollow) {
      // Unfollow
      await prisma.follow.delete({
        where: { id: existingFollow.id },
      });
      isFollowing = false;
    } else {
      // Follow
      await prisma.follow.create({
        data: {
          followerId: currentUserId,
          followingId: targetUserId,
        },
      });
      isFollowing = true;

      // Create notification for the user being followed
      await createNotification({
        userId: targetUserId,
        actorId: currentUserId,
        type: NotificationType.FOLLOW,
      });
    }

    // Get updated followers count
    followersCount = await prisma.follow.count({
      where: { followingId: targetUserId },
    });

    return NextResponse.json({
      isFollowing,
      followersCount,
    });
  } catch (error) {
    console.error("Error toggling follow:", error);
    return NextResponse.json(
      { error: "Failed to toggle follow" },
      { status: 500 }
    );
  }
}
