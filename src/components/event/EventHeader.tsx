"use client";

import Link from "next/link";
import { ChevronLeft, Share2, Heart } from "lucide-react";
import { DevnetBadge } from "@/components/shared/Badge";
import { Button } from "@/components/ui/button";
import WalletDrawer from "@/components/WalletDrawer";
import { formatWalletAddress } from "@/services/users";

interface EventHeaderProps {
  connected: boolean;
  publicKey: string | null;
  onShare?: () => void;
  onFavorite?: () => void;
}

export function EventHeader({
  connected,
  publicKey,
  onShare,
  onFavorite,
}: EventHeaderProps) {
  return (
    <div className="bg-surface/70 backdrop-blur-xl border-b border-border/30 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
        <Link
          href="/"
          className="flex items-center gap-2 text-foreground hover:text-primary transition-all hover:gap-3"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="font-medium text-sm">Back</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={onShare}
            className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <Share2 className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            onClick={onFavorite}
            className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors group"
          >
            <Heart className="w-4 h-4 text-muted-foreground group-hover:text-red-500" />
          </button>

          <DevnetBadge />

          {connected ? (
            <WalletDrawer>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-green-400 text-green-700 hover:bg-green-50 rounded-xl"
              >
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {formatWalletAddress(publicKey || "")}
              </Button>
            </WalletDrawer>
          ) : (
            <WalletDrawer>
              <Button
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-violet-600 text-white hover:from-purple-600 hover:to-violet-700 rounded-xl shadow-lg shadow-purple-500/25"
              >
                Connect Wallet
              </Button>
            </WalletDrawer>
          )}
        </div>
      </div>
    </div>
  );
}
