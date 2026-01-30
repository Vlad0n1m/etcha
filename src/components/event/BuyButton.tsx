"use client";

import { Ticket, Loader2 } from "lucide-react";
import { formatEventPrice } from "@/services/events";

interface BuyButtonProps {
  totalPrice: number;
  quantity: number;
  isMinting: boolean;
  isAtLimit: boolean;
  isSoldOut: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

export function BuyButton({
  totalPrice,
  quantity,
  isMinting,
  isAtLimit,
  isSoldOut,
  isDisabled,
  onClick,
}: BuyButtonProps) {
  const getButtonContent = () => {
    if (isMinting) {
      return (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Processing...
        </span>
      );
    }

    if (isAtLimit) {
      return (
        <span className="flex items-center justify-center gap-2">
          <Ticket className="w-5 h-5" />
          Ticket Limit Reached
        </span>
      );
    }

    if (isSoldOut) {
      return (
        <span className="flex items-center justify-center gap-2">
          <Ticket className="w-5 h-5" />
          Sold Out
        </span>
      );
    }

    if (totalPrice === 0) {
      return (
        <span className="flex items-center justify-center gap-2">
          <Ticket className="w-5 h-5" />
          Get Free Ticket
        </span>
      );
    }

    return (
      <span className="flex items-center justify-center gap-2">
        <Ticket className="w-5 h-5" />
        Buy {quantity > 1 ? `${quantity} tickets` : "ticket"} for{" "}
        {formatEventPrice(totalPrice)}
      </span>
    );
  };

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className="w-full bg-gradient-to-r from-primary to-violet-600 text-primary-foreground font-bold py-4 rounded-2xl hover:from-primary/90 hover:to-violet-600/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-primary/25 text-base"
    >
      {getButtonContent()}
    </button>
  );
}

// Disabled buy button for legacy events
export function DisabledBuyButton() {
  return (
    <button
      disabled
      className="w-full bg-muted text-muted-foreground font-semibold py-4 rounded-2xl cursor-not-allowed"
    >
      Upgrade event first to buy tickets
    </button>
  );
}
