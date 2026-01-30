"use client";

import { Loader2, Calendar } from "lucide-react";
import EventCard from "@/components/EventCard";
import type { EventListItem } from "@/types";

interface AttendingEventsProps {
  events: EventListItem[];
  isLoading: boolean;
}

export function AttendingEvents({ events, isLoading }: AttendingEventsProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Пока не идёт ни на одно событие</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <EventCard
          key={event.id}
          id={event.id}
          title={event.title}
          company=""
          price={event.price}
          date={event.date}
          time={event.time}
          ticketsAvailable={0}
          imageUrl={event.imageUrl}
          category=""
          organizer={null}
          href={`/event/${event.id}`}
          size="lg"
          description={event.description}
        />
      ))}
    </div>
  );
}
