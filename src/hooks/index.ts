// ============================================
// ETCHA - Custom Hooks Index
// ============================================

// API & Data Fetching
export { useApi, apiFetch, useMutation, useOptimistic } from "./useApi";
export { usePagination, useInfiniteScroll, useScrollPosition } from "./usePagination";

// Authentication
export { useUnifiedAuth, useAuthRequired, useCurrentUser } from "./useAuth";

// Wallet
export { useWalletBalance, useWalletAddress, useWalletInfo } from "./useWalletBalance";

// Re-export common types for convenience
export type { ApiResponse, ApiError, PaginatedResponse } from "@/types";
