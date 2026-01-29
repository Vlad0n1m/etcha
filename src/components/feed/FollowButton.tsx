"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  authToken: string | null;
  onFollowChange?: (isFollowing: boolean, followersCount: number) => void;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "outline";
}

const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  isFollowing: initialIsFollowing,
  authToken,
  onFollowChange,
  size = "md",
  variant = "primary",
}) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!authToken || isLoading) return;

    setIsLoading(true);
    // Optimistic update
    const newIsFollowing = !isFollowing;
    setIsFollowing(newIsFollowing);

    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.isFollowing);
        onFollowChange?.(data.isFollowing, data.followersCount);
      } else {
        // Revert on error
        setIsFollowing(!newIsFollowing);
      }
    } catch {
      // Revert on error
      setIsFollowing(!newIsFollowing);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: "px-3 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-2.5 text-base",
  };

  const variantClasses = {
    primary: isFollowing
      ? "bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600"
      : "bg-purple-500 text-white hover:bg-purple-600",
    outline: isFollowing
      ? "border border-gray-300 text-gray-700 hover:border-red-300 hover:text-red-600 hover:bg-red-50"
      : "border border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      disabled={!authToken || isLoading}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        rounded-full font-medium transition-all
        flex items-center gap-1.5
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="w-4 h-4" />
          <span>Отписаться</span>
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          <span>Подписаться</span>
        </>
      )}
    </motion.button>
  );
};

export default FollowButton;
