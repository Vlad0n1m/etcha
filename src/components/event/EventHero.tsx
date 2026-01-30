"use client";

import Image from "next/image";
import { Users, Leaf } from "lucide-react";
import type { Event } from "@/types";

interface EventHeroProps {
  event: Event;
}

export function EventHero({ event }: EventHeroProps) {
  return (
    <div className="relative h-72 w-full overflow-hidden">
      <Image
        src={event.imageUrl || "/no-ticket-svgrepo-com.svg"}
        alt={event.title ? `${event.title} event cover image` : "Event cover image"}
        fill
        className="object-cover scale-105 hover:scale-100 transition-transform duration-700"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

      {/* Floating badges */}
      <div className="absolute top-4 left-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/90 text-foreground backdrop-blur-md shadow-lg border border-white/50">
          {event.category}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-500 to-green-500 text-white backdrop-blur-md shadow-lg">
          <Leaf className="w-3.5 h-3.5" />
          cNFT
        </span>
      </div>

      {/* Tickets available badge */}
      <div className="absolute top-4 right-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-white/50">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">
            {event.ticketsAvailable} left
          </span>
        </div>
      </div>
    </div>
  );
}
