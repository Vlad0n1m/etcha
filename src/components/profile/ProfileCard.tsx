"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, Plus, BadgeCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { FollowButton } from "@/components/feed";
import type { UserProfile } from "@/types";

interface ProfileCardProps {
  profile: UserProfile;
  userId: string;
  authToken: string | null;
  useSessionAuth: boolean;
  ticketsCount: number;
  attendingCount: number;
  canCreateEvents: boolean;
  onFollowChange: (isFollowing: boolean, followersCount: number) => void;
}

export function ProfileCard({
  profile,
  userId,
  authToken,
  useSessionAuth,
  ticketsCount,
  attendingCount,
  canCreateEvents,
  onFollowChange,
}: ProfileCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Avatar and Follow Button */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
          {profile.avatar ? (
            <Image
              src={profile.avatar}
              alt={profile.name || "User"}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white text-2xl font-bold">
              {(profile.name || "U")[0].toUpperCase()}
            </span>
          )}
        </div>

        {!profile.isOwnProfile && (
          <FollowButton
            userId={userId}
            isFollowing={profile.isFollowing}
            authToken={authToken}
            onFollowChange={onFollowChange}
            useSession={useSessionAuth}
          />
        )}
      </div>

      {/* Name and Bio */}
      <div className="flex items-center gap-1.5 mb-1">
        <h2 className="text-xl font-bold text-gray-900">
          {profile.name || "Аноним"}
        </h2>
        {profile.isOrganizer && (
          <BadgeCheck className="w-5 h-5 text-blue-500 shrink-0" />
        )}
      </div>

      {profile.walletAddress && (
        <p className="text-sm text-gray-500 font-mono mb-3">
          {profile.walletAddress.slice(0, 4)}...{profile.walletAddress.slice(-4)}
        </p>
      )}

      {profile.bio && <p className="text-gray-700 mb-4">{profile.bio}</p>}

      {/* Organizer/Admin buttons */}
      {profile.isOwnProfile && canCreateEvents && (
        <div className="flex items-center gap-2 mb-4">
          <Link
            href="/organizer/events"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors text-sm"
          >
            <Calendar className="w-4 h-4" />
            Мои события
          </Link>
          <Link
            href="/organizer/create-event"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Создать
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-5 text-sm">
        <StatItem value={profile.postsCount} label="постов" />
        <StatItem
          value={profile.isOwnProfile ? ticketsCount : attendingCount}
          label={profile.isOwnProfile ? "билетов" : "иду"}
        />
        <StatItem value={profile.followersCount} label="подписчиков" />
        <StatItem value={profile.followingCount} label="подписок" />
      </div>

      {/* Member since */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
        <Calendar className="w-4 h-4" />
        <span>
          На платформе{" "}
          {formatDistanceToNow(new Date(profile.createdAt), {
            addSuffix: false,
            locale: ru,
          })}
        </span>
      </div>
    </div>
  );
}

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-bold text-gray-900">{value}</span>
      <span className="text-gray-500">{label}</span>
    </div>
  );
}
