"use client";

import { useState } from "react";
import { Sparkles, MapPin, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import type { Event } from "@/types";
import { UI } from "@/lib/constants";

interface EventDescriptionProps {
  description: string;
}

export function EventDescription({ description }: EventDescriptionProps) {
  const [showFull, setShowFull] = useState(false);
  const isLong = description.length > UI.DESCRIPTION_TRUNCATE_LENGTH;

  return (
    <div className="bg-surface rounded-3xl p-6 mt-6 border border-border/50 shadow-sm">
      <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        About Event
      </h2>
      <div
        className={`text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap ${!showFull && isLong ? "line-clamp-6" : ""
          }`}
      >
        {description}
      </div>
      {isLong && (
        <button
          onClick={() => setShowFull(!showFull)}
          className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {showFull ? (
            <>
              Show less
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              Show more
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

interface EventVenueProps {
  company: string;
  fullAddress: string;
  locationMapUrl?: string | null;
}

export function EventVenue({ company, fullAddress, locationMapUrl }: EventVenueProps) {
  return (
    <div className="bg-surface rounded-3xl p-6 mt-4 border border-border/50 shadow-sm">
      <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <MapPin className="w-4 h-4 text-primary" />
        </div>
        Venue
      </h2>
      <div className="bg-muted/30 rounded-2xl p-4">
        <div className="text-base font-semibold text-foreground mb-1">
          {company}
        </div>
        <div className="text-sm text-muted-foreground leading-relaxed">
          {fullAddress}
        </div>
        {locationMapUrl ? (
          <a
            href={locationMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm text-primary font-medium hover:text-primary/80 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Maps
          </a>
        ) : (
          <button className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground cursor-not-allowed">
            <ExternalLink className="w-4 h-4" />
            No map link provided
          </button>
        )}
      </div>
    </div>
  );
}
