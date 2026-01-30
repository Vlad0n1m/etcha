"use client";

interface QuantitySelectorProps {
  quantity: number;
  maxQuantity: number;
  onChange: (change: number) => void;
}

export function QuantitySelector({
  quantity,
  maxQuantity,
  onChange,
}: QuantitySelectorProps) {
  if (maxQuantity <= 1) return null;

  return (
    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl mb-5">
      <span className="text-sm font-medium text-foreground">Quantity</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(-1)}
          disabled={quantity <= 1}
          className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          -
        </button>
        <span className="w-8 text-center font-bold text-foreground">
          {quantity}
        </span>
        <button
          onClick={() => onChange(1)}
          disabled={quantity >= maxQuantity}
          className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          +
        </button>
      </div>
    </div>
  );
}
