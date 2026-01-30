"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import type { Event, TicketType } from "@/types";
import { formatEventDate, formatEventPrice } from "@/services/events";

interface PurchaseConfirmModalProps {
  event: Event;
  ticketType: TicketType;
  quantity: number;
  totalPrice: number;
  isMinting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PurchaseConfirmModal({
  event,
  ticketType,
  quantity,
  totalPrice,
  isMinting,
  onConfirm,
  onCancel,
}: PurchaseConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl w-full max-w-md border border-border/50 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl">
          {/* Event Preview */}
          <div className="flex items-center gap-4 mb-6 pb-5 border-b border-border">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-muted flex-shrink-0">
              <Image
                src={event.imageUrl || "/no-ticket-svgrepo-com.svg"}
                alt={event.title}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-foreground truncate">
                {event.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {formatEventDate(event.date)} • {event.time}
              </p>
            </div>
          </div>

          {/* Purchase Details */}
          <div className="space-y-3 mb-6">
            <DetailRow label="Ticket Type" value={ticketType.name} />
            <DetailRow
              label="Quantity"
              value={`${quantity} ${quantity > 1 ? "tickets" : "ticket"}`}
            />
            <DetailRow
              label="Price per ticket"
              value={formatEventPrice(ticketType.price)}
            />
            <div className="h-px bg-border my-3" />
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold text-foreground">
                Total
              </span>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent">
                {formatEventPrice(totalPrice)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isMinting}
              className="flex-1 bg-muted text-foreground font-semibold py-3.5 rounded-2xl hover:bg-muted/80 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isMinting}
              className="flex-1 bg-gradient-to-r from-primary to-violet-600 text-primary-foreground font-bold py-3.5 rounded-2xl hover:from-primary/90 hover:to-violet-600/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/25"
            >
              {isMinting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                "Confirm Purchase"
              )}
            </button>
          </div>

          {/* Security note */}
          <p className="text-[11px] text-center text-muted-foreground mt-4">
            Secured by Solana blockchain • Ultra-low fees
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}
