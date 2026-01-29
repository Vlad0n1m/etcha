import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { auth } from "@/lib/auth";

const createPostSchema = z.object({
  content: z.string().max(2000).optional(),
  images: z.array(z.string().url()).max(4).optional(),
  type: z.enum(["REGULAR", "TICKET_PURCHASE", "ATTENDANCE"]).default("REGULAR"),
  eventId: z.string().optional(),
  ticketId: z.string().optional(),
  attendanceId: z.string().optional(),
});

/**
 * POST /api/feed/posts
 * Create a new post
 */
export async function POST(request: NextRequest) {
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
          // Invalid token, continue without auth
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createPostSchema.parse(body);

    // Validate that post has content or images
    if (!validatedData.content && (!validatedData.images || validatedData.images.length === 0)) {
      return NextResponse.json(
        { error: "Post must have content or at least one image" },
        { status: 400 }
      );
    }

    // Validate event exists if provided
    if (validatedData.eventId) {
      const event = await prisma.event.findUnique({
        where: { id: validatedData.eventId },
        select: { id: true },
      });
      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 400 });
      }
    }

    // Validate ticket ownership for TICKET_PURCHASE posts
    if (validatedData.type === "TICKET_PURCHASE" && validatedData.ticketId) {
      const ticket = await prisma.ticket.findFirst({
        where: {
          id: validatedData.ticketId,
          userId: userId,
        },
        select: { id: true, eventId: true },
      });
      if (!ticket) {
        return NextResponse.json(
          { error: "Ticket not found or does not belong to you" },
          { status: 400 }
        );
      }
      // Auto-set eventId from ticket
      if (!validatedData.eventId) {
        validatedData.eventId = ticket.eventId;
      }
    }

    // Validate attendance for ATTENDANCE posts
    if (validatedData.type === "ATTENDANCE" && validatedData.attendanceId) {
      const attendance = await prisma.attendance.findFirst({
        where: {
          id: validatedData.attendanceId,
          userId: userId,
        },
        select: { id: true, eventId: true, poapStatus: true },
      });
      if (!attendance) {
        return NextResponse.json(
          { error: "Attendance record not found or does not belong to you" },
          { status: 400 }
        );
      }
      // Auto-set eventId from attendance
      if (!validatedData.eventId) {
        validatedData.eventId = attendance.eventId;
      }
    }

    // Create post
    const post = await prisma.post.create({
      data: {
        authorId: userId,
        content: validatedData.content,
        images: validatedData.images || [],
        type: validatedData.type,
        eventId: validatedData.eventId,
        ticketId: validatedData.ticketId,
        attendanceId: validatedData.attendanceId,
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
      },
    });

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
      isLiked: false,
      poapProofTx,
    });
  } catch (error) {
    console.error("Error creating post:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
