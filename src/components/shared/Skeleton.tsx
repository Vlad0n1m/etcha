"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200/60",
        className
      )}
    />
  );
}

// Event Card Skeleton
export function EventCardSkeleton() {
  return (
    <div className="w-full overflow-hidden p-2 border border-gray-200 rounded-lg bg-gray-50">
      <div className="flex items-center gap-3">
        <Skeleton className="w-15 h-15 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    </div>
  );
}

// Post Card Skeleton
export function PostCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
      <div className="flex gap-6 pt-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  );
}

// Profile Card Skeleton
export function ProfileCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton className="w-20 h-20 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

// Ticket Type Skeleton
export function TicketTypeSkeleton() {
  return (
    <div className="w-full p-4 rounded-xl border-2 border-gray-200 space-y-2">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
}

// Comment Skeleton
export function CommentSkeleton() {
  return (
    <div className="flex gap-3 p-3">
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

// Notification Skeleton
export function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 border-b border-gray-100">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

// Event Detail Skeleton
export function EventDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <Skeleton className="h-14 w-full" />

      {/* Hero Image */}
      <Skeleton className="h-72 w-full" />

      <div className="px-4 max-w-2xl mx-auto">
        {/* Main Card */}
        <div className="bg-white rounded-3xl p-6 -mt-12 space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-5 w-32" />
          </div>

          {/* Event Details Grid */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl">
            <div className="flex gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
            <div className="flex gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
            <div className="flex gap-3 col-span-2">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-full" />
              </div>
            </div>
          </div>

          {/* Ticket Types */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <TicketTypeSkeleton />
            <TicketTypeSkeleton />
          </div>

          {/* Buy Button */}
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>

        {/* Description */}
        <div className="bg-white rounded-3xl p-6 mt-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton list generator
export function SkeletonList({
  count = 3,
  component: Component,
}: {
  count?: number;
  component: React.ComponentType;
}) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} />
      ))}
    </div>
  );
}
