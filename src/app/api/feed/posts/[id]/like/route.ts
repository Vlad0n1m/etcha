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
 * POST /api/feed/posts/[id]/like
 * Toggle like on a post
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
      select: { id: true, authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    let isLiked: boolean;
    let likesCount: number;

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: { id: existingLike.id },
      });
      isLiked = false;
    } else {
      // Like
      await prisma.like.create({
        data: {
          postId,
          userId,
        },
      });
      isLiked = true;

      // Create notification for post author (if not liking own post)
      if (post.authorId !== userId) {
        await createNotification({
          userId: post.authorId,
          actorId: userId,
          type: NotificationType.LIKE,
          postId,
        });
      }
    }

    // Get updated likes count
    likesCount = await prisma.like.count({
      where: { postId },
    });

    return NextResponse.json({
      isLiked,
      likesCount,
    });
  } catch (error) {
    console.error("Error toggling like:", error);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}
