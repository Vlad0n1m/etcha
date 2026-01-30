"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { PaginatedResponse, ApiError } from "@/types";
import { PAGINATION } from "@/lib/constants";

// ============================================
// Pagination Hook
// ============================================

interface UsePaginationOptions<T> {
  limit?: number;
  initialData?: T[];
  onSuccess?: (data: T[], hasMore: boolean) => void;
  onError?: (error: ApiError) => void;
  /** Function to extract unique key from item for deduplication. Defaults to (item) => item.id */
  getItemKey?: (item: T) => string;
}

interface UsePaginationReturn<T> {
  items: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: ApiError | null;
  hasMore: boolean;
  cursor: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  removeItem: (predicate: (item: T) => boolean) => void;
  updateItem: (predicate: (item: T) => boolean, updater: (item: T) => T) => void;
  addItem: (item: T, position?: "start" | "end") => void;
}

export function usePagination<T>(
  fetcher: (cursor: string | null, limit: number) => Promise<PaginatedResponse<T>>,
  options: UsePaginationOptions<T> = {}
): UsePaginationReturn<T> {
  const { limit = PAGINATION.DEFAULT_LIMIT, initialData = [], onSuccess, onError, getItemKey } = options;

  // Default key extractor assumes items have an 'id' property
  const keyExtractor = getItemKey ?? ((item: T) => (item as { id: string }).id);

  const [items, setItems] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);

  const isInitialLoadRef = useRef(true);

  const fetchData = useCallback(
    async (loadMore: boolean = false) => {
      if (loadMore && !hasMore) return;

      const currentCursor = loadMore ? cursor : null;

      if (loadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await fetcher(currentCursor, limit);

        if (loadMore) {
          // Deduplicate items when loading more to prevent duplicate key errors
          setItems((prev) => {
            const existingKeys = new Set(prev.map(keyExtractor));
            const newItems = response.items.filter(
              (item) => !existingKeys.has(keyExtractor(item))
            );
            return [...prev, ...newItems];
          });
        } else {
          setItems(response.items);
        }

        setHasMore(response.hasMore);
        setCursor(response.nextCursor ?? null);
        onSuccess?.(response.items, response.hasMore);
      } catch (err) {
        const apiError: ApiError = {
          message: err instanceof Error ? err.message : "Failed to load data",
          status: (err as { status?: number })?.status,
        };
        setError(apiError);
        onError?.(apiError);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [fetcher, limit, cursor, hasMore, onSuccess, onError]
  );

  const loadMore = useCallback(async () => {
    if (!isLoadingMore && hasMore) {
      await fetchData(true);
    }
  }, [fetchData, isLoadingMore, hasMore]);

  const refresh = useCallback(async () => {
    setCursor(null);
    setHasMore(true);
    await fetchData(false);
  }, [fetchData]);

  const reset = useCallback(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    setError(null);
    setIsLoading(false);
    setIsLoadingMore(false);
    isInitialLoadRef.current = true;
  }, []);

  // Helper methods for list manipulation
  const removeItem = useCallback((predicate: (item: T) => boolean) => {
    setItems((prev) => prev.filter((item) => !predicate(item)));
  }, []);

  const updateItem = useCallback(
    (predicate: (item: T) => boolean, updater: (item: T) => T) => {
      setItems((prev) =>
        prev.map((item) => (predicate(item) ? updater(item) : item))
      );
    },
    []
  );

  const addItem = useCallback((item: T, position: "start" | "end" = "start") => {
    setItems((prev) => (position === "start" ? [item, ...prev] : [...prev, item]));
  }, []);

  return {
    items,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    cursor,
    loadMore,
    refresh,
    reset,
    setItems,
    removeItem,
    updateItem,
    addItem,
  };
}

// ============================================
// Infinite Scroll Hook
// ============================================

interface UseInfiniteScrollOptions {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  threshold?: number;
  rootMargin?: string;
}

export function useInfiniteScroll(options: UseInfiniteScrollOptions) {
  const {
    hasMore,
    isLoading,
    onLoadMore,
    threshold = 0.1,
    rootMargin = "0px",
  } = options;

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const setLoadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loadMoreRef.current) {
        observerRef.current?.unobserve(loadMoreRef.current);
      }

      loadMoreRef.current = node;

      if (node && hasMore && !isLoading) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting && hasMore && !isLoading) {
              onLoadMore();
            }
          },
          { threshold, rootMargin }
        );
        observerRef.current.observe(node);
      }
    },
    [hasMore, isLoading, onLoadMore, threshold, rootMargin]
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return { loadMoreRef: setLoadMoreRef };
}

// ============================================
// Scroll Position Hook
// ============================================

interface UseScrollPositionOptions {
  threshold?: number;
}

export function useScrollPosition(options: UseScrollPositionOptions = {}) {
  const { threshold = 300 } = options;
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      setShowScrollTop(currentScrollY > threshold);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return {
    showScrollTop,
    scrollY,
    scrollToTop,
  };
}
