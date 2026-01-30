"use client";

import { Wallet, Copy, Eye, EyeOff, RefreshCw, Loader2 } from "lucide-react";
import WalletDrawer from "@/components/WalletDrawer";
import { Button } from "@/components/ui/button";
import { formatWalletAddress } from "@/services/users";

interface WalletSectionProps {
  connected: boolean;
  walletAddress: string | null;
  balance: number | null;
  isLoadingBalance: boolean;
  showBalance: boolean;
  copied: boolean;
  onCopyAddress: () => void;
  onToggleBalance: () => void;
  onRefreshBalance: () => void;
}

export function WalletSection({
  connected,
  walletAddress,
  balance,
  isLoadingBalance,
  showBalance,
  copied,
  onCopyAddress,
  onToggleBalance,
  onRefreshBalance,
}: WalletSectionProps) {
  if (connected && walletAddress) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-600 text-sm font-medium">
              Кошелёк подключен
            </span>
          </div>
          <button
            onClick={onCopyAddress}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title={copied ? "Скопировано!" : "Скопировать адрес"}
          >
            <Copy
              className={`w-4 h-4 ${copied ? "text-green-500" : "text-gray-500"}`}
            />
          </button>
        </div>

        <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 font-mono mb-3">
          {formatWalletAddress(walletAddress)}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">Баланс:</span>
            {isLoadingBalance ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              <span className="font-semibold text-gray-900">
                {showBalance
                  ? balance !== null
                    ? balance.toFixed(4)
                    : "0.0000"
                  : "***"}{" "}
                SOL
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleBalance}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title={showBalance ? "Скрыть баланс" : "Показать баланс"}
            >
              {showBalance ? (
                <EyeOff className="w-4 h-4 text-gray-500" />
              ) : (
                <Eye className="w-4 h-4 text-gray-500" />
              )}
            </button>
            <button
              onClick={onRefreshBalance}
              disabled={isLoadingBalance}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
              title="Обновить баланс"
            >
              <RefreshCw
                className={`w-4 h-4 text-gray-500 ${isLoadingBalance ? "animate-spin" : ""
                  }`}
              />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
      <div className="flex items-center gap-3">
        <Wallet className="w-6 h-6 text-purple-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-purple-900">
            Подключите Solana кошелёк
          </p>
          <p className="text-xs text-purple-600">
            Для покупки и управления билетами
          </p>
        </div>
        <WalletDrawer>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
            Подключить
          </Button>
        </WalletDrawer>
      </div>
    </div>
  );
}
