import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/users/[id]/posts
 * Get posts by a specific user
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: userId } = await params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    // Get current user (optional - for checking likes)
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
    const whereClause: Record<string, unknown> = { authorId: userId };
    if (cursor) {
      whereClause.id = { lt: cursor };
    }

    // Fetch posts
    const posts = await prisma.post.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
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
    const nextCursor = hasMore
      ? postsToReturn[postsToReturn.length - 1]?.id
      : null;

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
      attendanceMap = Object.fromEntries(
        attendances.map((a) => [a.id, { poapMintTx: a.poapMintTx }])
      );
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
      isLiked: currentUserId
        ? (post.likes as { id: string }[]).length > 0
        : false,
      poapProofTx: post.attendanceId
        ? attendanceMap[post.attendanceId]?.poapMintTx
        : null,
    }));

    return NextResponse.json({
      posts: formattedPosts,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching user posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
