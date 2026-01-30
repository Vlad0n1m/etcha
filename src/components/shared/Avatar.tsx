"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getUserInitials } from "@/services/users";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  href?: string;
  className?: string;
  showBorder?: boolean;
}

const sizeClasses = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
  xl: "w-20 h-20 text-2xl",
};

const imageSizes = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

export function Avatar({
  src,
  name,
  size = "md",
  href,
  className,
  showBorder = false,
}: AvatarProps) {
  const initials = getUserInitials(name);
  const imageSize = imageSizes[size];

  const content = (
    <div
      className={cn(
        "rounded-full overflow-hidden flex items-center justify-center flex-shrink-0",
        "bg-gradient-to-br from-purple-500 to-blue-500",
        sizeClasses[size],
        showBorder && "border-2 border-border/50",
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={name || "Avatar"}
          width={imageSize}
          height={imageSize}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-white font-bold">{initials}</span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}

// Avatar with status indicator
interface AvatarWithStatusProps extends AvatarProps {
  status?: "online" | "offline" | "away";
}

export function AvatarWithStatus({
  status,
  ...props
}: AvatarWithStatusProps) {
  const statusColors = {
    online: "bg-green-500",
    offline: "bg-gray-400",
    away: "bg-yellow-500",
  };

  return (
    <div className="relative inline-block">
      <Avatar {...props} />
      {status && (
        <div
          className={cn(
            "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white",
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}

// Avatar Group for showing multiple users
interface AvatarGroupProps {
  users: Array<{ src?: string | null; name?: string | null }>;
  max?: number;
  size?: AvatarProps["size"];
}

export function AvatarGroup({ users, max = 4, size = "sm" }: AvatarGroupProps) {
  const displayUsers = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className="flex -space-x-2">
      {displayUsers.map((user, index) => (
        <Avatar
          key={index}
          src={user.src}
          name={user.name}
          size={size}
          showBorder
          className="ring-2 ring-white"
        />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            "rounded-full bg-gray-200 flex items-center justify-center ring-2 ring-white",
            sizeClasses[size]
          )}
        >
          <span className="text-gray-600 font-medium">+{remaining}</span>
        </div>
      )}
    </div>
  );
}
