import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/users/[id]
 * Get user profile by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: userId } = await params;

    // Get current user (optional - for checking follow status)
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
        try {
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
            userId: string;
          };
          currentUserId = decoded.userId;
        } catch {
          // Invalid token, continue as anonymous
        }
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
        walletAddress: true,
        createdAt: true,
        role: true,
        profile: {
          select: {
            nickname: true,
            avatar: true,
            bio: true,
          },
        },
        organizer: {
          select: {
            status: true,
          },
        },
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if current user follows this user
    let isFollowing = false;
    if (currentUserId && currentUserId !== userId) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: userId,
          },
        },
      });
      isFollowing = !!follow;
    }

    // User is verified organizer if role is ORGANIZER and status is APPROVED
    const isOrganizer =
      user.role === "ORGANIZER" && user.organizer?.status === "APPROVED";

    return NextResponse.json({
      id: user.id,
      name: user.profile?.nickname || user.name,
      avatar: user.profile?.avatar || user.image,
      bio: user.profile?.bio,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
      postsCount: user._count.posts,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      isFollowing,
      isOwnProfile: currentUserId === userId,
      isOrganizer,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
