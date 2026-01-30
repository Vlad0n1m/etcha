"use client";

import { useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useAuth as useWalletAuth } from "@/components/AuthProvider";
import type { User, AuthState } from "@/types";

// ============================================
// Unified Auth Hook
// ============================================

interface UseUnifiedAuthReturn {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Auth method info
  authMethod: "session" | "wallet" | null;
  walletToken: string | null;
  useSessionAuth: boolean;

  // Session data
  session: ReturnType<typeof useSession>["data"];
  sessionStatus: ReturnType<typeof useSession>["status"];

  // Helpers
  getAuthHeaders: () => Record<string, string>;
  getCredentials: () => RequestCredentials;
}

export function useUnifiedAuth(): UseUnifiedAuthReturn {
  const { data: session, status: sessionStatus } = useSession();
  const { token: walletToken } = useWalletAuth();

  const isLoading = sessionStatus === "loading";

  const authMethod = useMemo(() => {
    if (walletToken) return "wallet";
    if (session?.user) return "session";
    return null;
  }, [walletToken, session?.user]);

  const isAuthenticated = useMemo(() => {
    return !!walletToken || !!session?.user;
  }, [walletToken, session?.user]);

  const user = useMemo((): User | null => {
    if (session?.user) {
      return {
        id: session.user.id || "",
        name: session.user.name || null,
        email: session.user.email || null,
        image: session.user.image || null,
        walletAddress: null,
        role: session.user.role as User["role"],
        organizerStatus: session.user.organizerStatus as User["organizerStatus"],
      };
    }
    return null;
  }, [session?.user]);

  const useSessionAuth = useMemo(() => {
    return !walletToken && !!session;
  }, [walletToken, session]);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (walletToken) {
      headers.Authorization = `Bearer ${walletToken}`;
    }
    return headers;
  }, [walletToken]);

  const getCredentials = useCallback((): RequestCredentials => {
    return useSessionAuth ? "include" : "same-origin";
  }, [useSessionAuth]);

  return {
    user,
    isAuthenticated,
    isLoading,
    authMethod,
    walletToken,
    useSessionAuth,
    session,
    sessionStatus,
    getAuthHeaders,
    getCredentials,
  };
}

// ============================================
// Auth Required Hook
// ============================================

export function useAuthRequired() {
  const { isAuthenticated, isLoading, authMethod } = useUnifiedAuth();

  return {
    isReady: !isLoading && isAuthenticated,
    needsAuth: !isLoading && !isAuthenticated,
    isLoading,
    authMethod,
  };
}

// ============================================
// Current User Hook
// ============================================

interface UseCurrentUserReturn {
  userId: string | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useCurrentUser(): UseCurrentUserReturn {
  const { user, isLoading, isAuthenticated } = useUnifiedAuth();

  return {
    userId: user?.id || null,
    user,
    isLoading,
    isAuthenticated,
  };
}
