import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/users/[id]/following
 * Get users that a user follows
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: userId } = await params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    // Get current user (optional - for checking follow status)
    let currentUserId: string | null = null;
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

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build where clause
    const whereClause: Record<string, unknown> = { followerId: userId };
    if (cursor) {
      whereClause.id = { lt: cursor };
    }

    // Fetch following
    const following = await prisma.follow.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: {
        following: {
          select: {
            id: true,
            name: true,
            image: true,
            walletAddress: true,
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

    // Check if there are more
    const hasMore = following.length > limit;
    const followingToReturn = hasMore ? following.slice(0, -1) : following;
    const nextCursor = hasMore
      ? followingToReturn[followingToReturn.length - 1]?.id
      : null;

    // Get follow status for current user
    let followingIds: Set<string> = new Set();
    if (currentUserId) {
      const followingRelations = await prisma.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: {
            in: followingToReturn.map((f) => f.following.id),
          },
        },
        select: { followingId: true },
      });
      followingIds = new Set(followingRelations.map((f) => f.followingId));
    }

    // Format response
    const formattedFollowing = followingToReturn.map((follow) => ({
      id: follow.following.id,
      name: follow.following.profile?.nickname || follow.following.name,
      avatar: follow.following.profile?.avatar || follow.following.image,
      walletAddress: follow.following.walletAddress,
      isFollowing: followingIds.has(follow.following.id),
      followedAt: follow.createdAt,
    }));

    return NextResponse.json({
      following: formattedFollowing,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching following:", error);
    return NextResponse.json(
      { error: "Failed to fetch following" },
      { status: 500 }
    );
  }
}
