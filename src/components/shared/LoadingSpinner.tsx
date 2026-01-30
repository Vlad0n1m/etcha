"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-16 h-16",
};

export function LoadingSpinner({
  size = "md",
  text,
  className,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="relative">
        {size === "lg" && (
          <div className="w-16 h-16 rounded-full bg-primary/10 animate-pulse" />
        )}
        <Loader2
          className={cn(
            "text-primary animate-spin",
            sizeClasses[size],
            size === "lg" && "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          )}
        />
      </div>
      {text && (
        <p className="text-muted-foreground font-medium mt-4">{text}</p>
      )}
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

// Page loading variant
export function PageLoader({ text = "Loading..." }: { text?: string }) {
  return <LoadingSpinner size="lg" text={text} fullScreen />;
}

// Inline loading for buttons etc
export function InlineLoader({ className }: { className?: string }) {
  return <LoadingSpinner size="sm" className={className} />;
}
