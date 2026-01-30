"use client";

import type { TicketType } from "@/types";
import { isTicketTypeSoldOut } from "@/services/events";
import { cn } from "@/lib/utils";

interface TicketTypeSelectorProps {
  ticketTypes: TicketType[];
  selectedType: TicketType | null;
  onSelect: (ticketType: TicketType) => void;
}

export function TicketTypeSelector({
  ticketTypes,
  selectedType,
  onSelect,
}: TicketTypeSelectorProps) {
  const formatPrice = (price: number): string => {
    if (price >= 1000) return `${(price / 1000).toFixed(1)}k`;
    return `${price}`;
  };

  return (
    <div className="mb-5">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        Select Ticket Type
      </h3>
      <div className="space-y-2">
        {ticketTypes.map((ticketType) => {
          const isSoldOut = isTicketTypeSoldOut(ticketType);
          const isSelected = selectedType?.id === ticketType.id;

          return (
            <button
              key={ticketType.id}
              onClick={() => !isSoldOut && onSelect(ticketType)}
              disabled={isSoldOut}
              className={cn(
                "w-full p-4 rounded-xl border-2 transition-all text-left",
                isSelected
                  ? "border-primary bg-primary/5"
                  : isSoldOut
                    ? "border-border bg-muted/30 opacity-60 cursor-not-allowed"
                    : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-base font-semibold",
                        isSelected ? "text-primary" : "text-foreground"
                      )}
                    >
                      {ticketType.name}
                    </span>
                    {isSoldOut && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                        SOLD OUT
                      </span>
                    )}
                  </div>
                  {ticketType.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {ticketType.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {ticketType.available}/{ticketType.quantity} available
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      "text-lg font-bold",
                      isSelected ? "text-primary" : "text-foreground"
                    )}
                  >
                    {formatPrice(ticketType.price)}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">SOL</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
