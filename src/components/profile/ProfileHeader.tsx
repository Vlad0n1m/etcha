"use client";

import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";

interface ProfileHeaderProps {
  name: string | null;
  isOwnProfile: boolean;
}

export function ProfileHeader({ name, isOwnProfile }: ProfileHeaderProps) {
  return (
    <div className="sticky top-[30px] lg:top-[60px] z-10 bg-white border-b border-gray-200">
      <div className="w-full px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/feed"
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {name || "Профиль"}
          </h1>
        </div>
        {isOwnProfile && (
          <Link
            href="/settings"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Настройки"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </Link>
        )}
      </div>
    </div>
  );
}
