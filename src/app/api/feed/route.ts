import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";
import { auth } from "@/lib/auth";

/**
 * GET /api/feed
 * Get feed posts with pagination
 * Query params:
 * - tab: "all" | "following" (default: "all")
 * - cursor: post ID for pagination
 * - limit: number of posts (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "all";
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    // Get current user (optional - for checking likes and following tab)
    let currentUserId: string | null = null;

    // Try NextAuth session first
    const session = await auth();
    if (session?.user?.id) {
      currentUserId = session.user.id;
    }

    // Fallback to JWT token
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

    // Build where clause based on tab
    let whereClause: Record<string, unknown> = {};

    if (tab === "following" && currentUserId) {
      // Get IDs of users that current user follows
      const following = await prisma.follow.findMany({
        where: { followerId: currentUserId },
        select: { followingId: true },
      });
      const followingIds = following.map((f) => f.followingId);

      if (followingIds.length === 0) {
        // User follows no one, return empty feed
        return NextResponse.json({
          posts: [],
          nextCursor: null,
          hasMore: false,
        });
      }

      whereClause = {
        authorId: { in: followingIds },
      };
    }

    // Add cursor for pagination
    if (cursor) {
      whereClause = {
        ...whereClause,
        id: { lt: cursor },
      };
    }

    // Fetch posts
    const posts = await prisma.post.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit + 1, // Fetch one extra to check if there are more
      include: {
        author: {
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
        event: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            date: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        likes: currentUserId
          ? {
            where: { userId: currentUserId },
            select: { id: true },
          }
          : false,
      },
    });

    // Check if there are more posts
    const hasMore = posts.length > limit;
    const postsToReturn = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore ? postsToReturn[postsToReturn.length - 1]?.id : null;

    // Get attendance info for ATTENDANCE type posts
    const attendanceIds = postsToReturn
      .filter((p) => p.type === "ATTENDANCE" && p.attendanceId)
      .map((p) => p.attendanceId as string);

    let attendanceMap: Record<string, { poapMintTx: string | null }> = {};
    if (attendanceIds.length > 0) {
      const attendances = await prisma.attendance.findMany({
        where: { id: { in: attendanceIds } },
        select: { id: true, poapMintTx: true },
      });
      attendanceMap = Object.fromEntries(attendances.map((a) => [a.id, { poapMintTx: a.poapMintTx }]));
    }

    // Format response
    const formattedPosts = postsToReturn.map((post) => ({
      id: post.id,
      content: post.content,
      images: post.images,
      type: post.type,
      createdAt: post.createdAt,
      author: {
        id: post.author.id,
        name: post.author.profile?.nickname || post.author.name,
        avatar: post.author.profile?.avatar || post.author.image,
        walletAddress: post.author.walletAddress,
      },
      event: post.event
        ? {
          id: post.event.id,
          title: post.event.title,
          imageUrl: post.event.imageUrl,
          date: post.event.date,
        }
        : null,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      isLiked: currentUserId ? (post.likes as { id: string }[]).length > 0 : false,
      // Include POAP proof transaction for ATTENDANCE posts
      poapProofTx: post.attendanceId ? attendanceMap[post.attendanceId]?.poapMintTx : null,
    }));

    return NextResponse.json({
      posts: formattedPosts,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching feed:", error);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}
