"use client";

import { cn } from "@/lib/utils";
import { Leaf } from "lucide-react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "error" | "cnft" | "devnet";
  size?: "sm" | "md";
  className?: string;
  icon?: React.ReactNode;
}

const variantClasses = {
  default: "bg-white/90 text-foreground border border-white/50",
  primary: "bg-primary/10 text-primary",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
  cnft: "bg-gradient-to-r from-emerald-500 to-green-500 text-white",
  devnet: "bg-gradient-to-r from-purple-100 to-violet-100 text-purple-700 border border-purple-200/50",
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-3 py-1 text-xs",
};

export function Badge({
  children,
  variant = "default",
  size = "md",
  className,
  icon,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}

// Preset badges
export function CNFTBadge({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <Badge variant="cnft" size={size} icon={<Leaf className="w-3.5 h-3.5" />}>
      cNFT
    </Badge>
  );
}

export function DevnetBadge() {
  return (
    <Badge variant="devnet" size="sm">
      Devnet
    </Badge>
  );
}

export function SoldOutBadge() {
  return (
    <Badge variant="error" size="sm">
      Sold Out
    </Badge>
  );
}

export function FreeBadge() {
  return (
    <Badge variant="success" size="sm">
      Free
    </Badge>
  );
}

// Status badge with dot indicator
interface StatusBadgeProps {
  status: "active" | "pending" | "completed" | "error";
  children: React.ReactNode;
}

const statusDotColors = {
  active: "bg-green-500",
  pending: "bg-yellow-500",
  completed: "bg-blue-500",
  error: "bg-red-500",
};

export function StatusBadge({ status, children }: StatusBadgeProps) {
  return (
    <Badge variant="default" size="md">
      <span className={cn("w-2 h-2 rounded-full animate-pulse", statusDotColors[status])} />
      {children}
    </Badge>
  );
}
