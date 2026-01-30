import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/users/[id]/attending
 * Get unique upcoming events that the user is attending (has tickets for)
 * Returns only one entry per event, even if user has multiple tickets
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: userId } = await params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get unique events where user has valid tickets
    // Only show upcoming events (date >= today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tickets = await prisma.ticket.findMany({
      where: {
        userId: userId,
        isValid: true,
        isUsed: false,
        event: {
          date: {
            gte: today,
          },
        },
      },
      select: {
        eventId: true,
        event: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            date: true,
            time: true,
            fullAddress: true,
            description: true,
          },
        },
      },
      orderBy: {
        event: {
          date: "asc",
        },
      },
    });

    // Deduplicate by eventId - keep only one entry per event
    const uniqueEventsMap = new Map<string, typeof tickets[0]["event"]>();
    for (const ticket of tickets) {
      if (!uniqueEventsMap.has(ticket.eventId)) {
        uniqueEventsMap.set(ticket.eventId, ticket.event);
      }
    }

    const events = Array.from(uniqueEventsMap.values()).map((event) => ({
      id: event.id,
      title: event.title,
      imageUrl: event.imageUrl,
      date: event.date,
      time: event.time,
      location: event.fullAddress,
      description: event.description,
    }));

    return NextResponse.json({
      events,
      count: events.length,
    });
  } catch (error) {
    console.error("Error fetching attending events:", error);
    return NextResponse.json(
      { error: "Failed to fetch attending events" },
      { status: 500 }
    );
  }
}
