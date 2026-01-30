"use client";

import { Sparkles, Loader2 } from "lucide-react";

interface UpgradeEventBannerProps {
  isUpgrading: boolean;
  onUpgrade: () => void;
}

export function UpgradeEventBanner({
  isUpgrading,
  onUpgrade,
}: UpgradeEventBannerProps) {
  return (
    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200/50 rounded-2xl p-5 mb-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">Upgrade Required</p>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            This event needs to be upgraded to enable ticket purchases with
            ultra-low fees.
          </p>
        </div>
      </div>
      <button
        onClick={onUpgrade}
        disabled={isUpgrading}
        className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold py-3 rounded-xl hover:from-amber-600 hover:to-yellow-600 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50"
      >
        {isUpgrading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Upgrading...
          </span>
        ) : (
          "Upgrade Event to cNFT"
        )}
      </button>
    </div>
  );
}
