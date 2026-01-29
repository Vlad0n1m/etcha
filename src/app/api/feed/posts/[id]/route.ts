import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/feed/posts/[id]
 * Get a single post by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get current user (optional - for checking likes)
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

    const post = await prisma.post.findUnique({
      where: { id },
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

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Get POAP proof tx if attendance post
    let poapProofTx = null;
    if (post.attendanceId) {
      const attendance = await prisma.attendance.findUnique({
        where: { id: post.attendanceId },
        select: { poapMintTx: true },
      });
      poapProofTx = attendance?.poapMintTx;
    }

    return NextResponse.json({
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
      poapProofTx,
    });
  } catch (error) {
    console.error("Error fetching post:", error);
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
}

/**
 * DELETE /api/feed/posts/[id]
 * Delete a post (only by author)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    // Find post and verify ownership
    const post = await prisma.post.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.authorId !== userId) {
      return NextResponse.json(
        { error: "You can only delete your own posts" },
        { status: 403 }
      );
    }

    // Delete post (cascades to likes and comments)
    await prisma.post.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
