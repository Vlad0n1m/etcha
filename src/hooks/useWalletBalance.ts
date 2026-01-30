"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

// ============================================
// Wallet Balance Hook
// ============================================

interface UseWalletBalanceReturn {
  balance: number | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  formatBalance: (decimals?: number) => string;
}

export function useWalletBalance(): UseWalletBalanceReturn {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();

  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBalance = useCallback(async () => {
    if (!publicKey || !connection || !connected) {
      setBalance(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const lamports = await connection.getBalance(publicKey);
      setBalance(lamports / LAMPORTS_PER_SOL);
    } catch (err) {
      console.error("Error loading balance:", err);
      setError(err instanceof Error ? err.message : "Failed to load balance");
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connection, connected]);

  // Load balance when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      loadBalance();
    } else {
      setBalance(null);
      setError(null);
    }
  }, [connected, publicKey, loadBalance]);

  const formatBalance = useCallback(
    (decimals: number = 4): string => {
      if (balance === null) return "0.0000";
      return balance.toFixed(decimals);
    },
    [balance]
  );

  return {
    balance,
    isLoading,
    error,
    refresh: loadBalance,
    formatBalance,
  };
}

// ============================================
// Wallet Address Hook
// ============================================

interface UseWalletAddressReturn {
  address: string | null;
  shortAddress: string | null;
  connected: boolean;
  copyAddress: () => Promise<boolean>;
}

export function useWalletAddress(): UseWalletAddressReturn {
  const { publicKey, connected } = useWallet();
  const [copied, setCopied] = useState(false);

  const address = publicKey?.toBase58() || null;

  const shortAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : null;

  const copyAddress = useCallback(async (): Promise<boolean> => {
    if (!address) return false;

    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      return false;
    }
  }, [address]);

  return {
    address,
    shortAddress,
    connected,
    copyAddress,
  };
}

// ============================================
// Combined Wallet Hook
// ============================================

export function useWalletInfo() {
  const balance = useWalletBalance();
  const address = useWalletAddress();

  return {
    ...balance,
    ...address,
  };
}
