"use client";

import Image from "next/image";
import Link from "next/link";
import { Users, UserPlus, UserCheck, Loader2 } from "lucide-react";
import type { EventOrganizer as OrganizerType } from "@/types";

interface EventOrganizerProps {
  organizer: OrganizerType;
  followersCount: number;
  isFollowing: boolean;
  isFollowLoading: boolean;
  isAuthenticated: boolean;
  onFollowToggle: () => void;
}

export function EventOrganizer({
  organizer,
  followersCount,
  isFollowing,
  isFollowLoading,
  isAuthenticated,
  onFollowToggle,
}: EventOrganizerProps) {
  return (
    <div className="bg-surface rounded-3xl p-6 mt-4 border border-border/50 shadow-sm">
      <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Users className="w-4 h-4 text-primary" />
        </div>
        Organizer
      </h2>

      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl">
        <Link
          href={organizer.id ? `/profile/${organizer.id}` : "#"}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center overflow-hidden flex-shrink-0 border border-border/50 hover:scale-105 transition-transform"
        >
          <Image
            src={organizer.avatar || "/etcha.png"}
            alt={organizer.name || "Organizer"}
            width={56}
            height={56}
            className="w-full h-full object-cover"
          />
        </Link>

        <div className="flex-1 min-w-0">
          <Link
            href={organizer.id ? `/profile/${organizer.id}` : "#"}
            className="text-base font-semibold text-foreground mb-0.5 hover:text-primary transition-colors block"
          >
            {organizer.name || "Event Organizer"}
          </Link>
          <div className="text-xs text-muted-foreground line-clamp-2">
            {organizer.description || "Professional event organizer"}
          </div>
          {followersCount > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              {followersCount} {followersCount === 1 ? "follower" : "followers"}
            </div>
          )}
        </div>

        {isAuthenticated ? (
          <button
            onClick={onFollowToggle}
            disabled={isFollowLoading}
            className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all flex-shrink-0 flex items-center gap-2 disabled:opacity-50 ${isFollowing
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}
          >
            {isFollowLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isFollowing ? (
              <>
                <UserCheck className="w-4 h-4" />
                Following
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Follow
              </>
            )}
          </button>
        ) : (
          <Link
            href="/auth/login"
            className="px-5 py-2.5 bg-primary/10 text-primary text-sm font-semibold rounded-xl hover:bg-primary/20 transition-colors flex-shrink-0 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Follow
          </Link>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button className="flex flex-col items-center justify-center gap-1.5 p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
          <span className="text-xs text-muted-foreground">Contact</span>
        </button>
        <button className="flex flex-col items-center justify-center gap-1.5 p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
          <span className="text-xs text-muted-foreground">Policy</span>
        </button>
        <button className="flex flex-col items-center justify-center gap-1.5 p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
          <span className="text-xs text-muted-foreground">Report</span>
        </button>
      </div>
    </div>
  );
}
