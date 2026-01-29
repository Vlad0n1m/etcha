import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
});

/**
 * GET /api/feed/posts/[id]/comments
 * Get comments for a post
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Build where clause
    const whereClause: Record<string, unknown> = { postId };
    if (cursor) {
      whereClause.id = { lt: cursor };
    }

    // Fetch comments
    const comments = await prisma.comment.findMany({
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
      },
    });

    // Check if there are more comments
    const hasMore = comments.length > limit;
    const commentsToReturn = hasMore ? comments.slice(0, -1) : comments;
    const nextCursor = hasMore
      ? commentsToReturn[commentsToReturn.length - 1]?.id
      : null;

    // Format response
    const formattedComments = commentsToReturn.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: {
        id: comment.author.id,
        name: comment.author.profile?.nickname || comment.author.name,
        avatar: comment.author.profile?.avatar || comment.author.image,
        walletAddress: comment.author.walletAddress,
      },
    }));

    return NextResponse.json({
      comments: formattedComments,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feed/posts/[id]/comments
 * Create a comment on a post
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        postId,
        authorId: userId,
        content: validatedData.content,
      },
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
      },
    });

    return NextResponse.json({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: {
        id: comment.author.id,
        name: comment.author.profile?.nickname || comment.author.name,
        avatar: comment.author.profile?.avatar || comment.author.image,
        walletAddress: comment.author.walletAddress,
      },
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
