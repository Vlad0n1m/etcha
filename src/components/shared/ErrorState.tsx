"use client";

import Link from "next/link";
import { AlertCircle, RefreshCw, ChevronLeft, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  backLink?: string;
  backText?: string;
  icon?: "error" | "ticket" | "empty";
  className?: string;
  fullScreen?: boolean;
}

const icons = {
  error: AlertCircle,
  ticket: Ticket,
  empty: Ticket,
};

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred. Please try again.",
  onRetry,
  backLink = "/",
  backText = "Back to Events",
  icon = "error",
  className,
  fullScreen = false,
}: ErrorStateProps) {
  const Icon = icons[icon];
  const iconBgColor = icon === "error" ? "bg-red-100" : "bg-gray-100";
  const iconColor = icon === "error" ? "text-red-500" : "text-gray-500";

  const content = (
    <div
      className={cn(
        "text-center bg-surface rounded-3xl p-8 border border-border shadow-lg max-w-md",
        className
      )}
    >
      <div
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
          iconBgColor
        )}
      >
        <Icon className={cn("w-8 h-8", iconColor)} />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
      <p className="text-muted-foreground mb-6">{message}</p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        )}
        <Link
          href={backLink}
          className="inline-flex items-center gap-2 bg-muted text-foreground px-6 py-3 rounded-xl font-medium hover:bg-muted/80 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          {backText}
        </Link>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return content;
}

// Event not found variant
export function EventNotFound() {
  return (
    <ErrorState
      title="Event Not Found"
      message="The event you're looking for doesn't exist or has been removed."
      icon="ticket"
      fullScreen
    />
  );
}

// Generic not found
export function NotFound({ type = "page" }: { type?: string }) {
  return (
    <ErrorState
      title={`${type.charAt(0).toUpperCase() + type.slice(1)} Not Found`}
      message={`The ${type} you're looking for doesn't exist.`}
      icon="empty"
      fullScreen
    />
  );
}
