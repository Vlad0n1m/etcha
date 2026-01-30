"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketLimitWarningProps {
  maxPerUser: number;
  currentCount: number;
  isAtLimit: boolean;
}

export function TicketLimitWarning({
  maxPerUser,
  currentCount,
  isAtLimit,
}: TicketLimitWarningProps) {
  return (
    <div
      className={cn(
        "p-3 rounded-xl mb-5 flex items-center gap-2",
        isAtLimit
          ? "bg-red-50 border border-red-200"
          : "bg-blue-50 border border-blue-200"
      )}
    >
      <AlertCircle
        className={cn(
          "w-4 h-4 flex-shrink-0",
          isAtLimit ? "text-red-500" : "text-blue-500"
        )}
      />
      <span
        className={cn("text-sm", isAtLimit ? "text-red-700" : "text-blue-700")}
      >
        {isAtLimit
          ? `You have reached the limit of ${maxPerUser} tickets for this event.`
          : `Limit: ${maxPerUser} tickets per account. You have ${currentCount}.`}
      </span>
    </div>
  );
}
