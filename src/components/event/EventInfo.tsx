"use client";

import { Calendar, Clock, MapPin, ExternalLink, Sparkles } from "lucide-react";
import type { Event } from "@/types";
import { formatEventDate } from "@/services/events";

interface EventInfoProps {
  event: Event;
}

export function EventInfo({ event }: EventInfoProps) {
  return (
    <div className="mb-5">
      {/* Title Section */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground mb-2 leading-tight">
          {event.title}
        </h1>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {event.company}
          </span>
        </div>
      </div>

      {/* Event Details Grid */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-2xl">
        <InfoItem
          icon={<Calendar className="w-5 h-5 text-primary" />}
          label="Date"
          value={formatEventDate(event.date)}
        />

        <InfoItem
          icon={<Clock className="w-5 h-5 text-primary" />}
          label="Time"
          value={event.time}
        />

        <div className="flex items-center gap-3 col-span-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
              Location
            </div>
            <div className="text-sm font-semibold text-foreground">
              {event.fullAddress}
            </div>
          </div>
          {event.locationMapUrl && (
            <a
              href={event.locationMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          {label}
        </div>
        <div className="text-sm font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}
