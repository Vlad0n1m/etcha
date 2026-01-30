"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ApiResponse, ApiError } from "@/types";
import { TIMEOUTS } from "@/lib/constants";

// ============================================
// API Hook - Base Hook for API calls
// ============================================

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
  immediate?: boolean;
}

interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
}

interface UseApiReturn<T, Args extends unknown[]> extends UseApiState<T> {
  execute: (...args: Args) => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
}

export function useApi<T, Args extends unknown[] = []>(
  fetcher: (...args: Args) => Promise<T>,
  options: UseApiOptions<T> = {}
): UseApiReturn<T, Args> {
  const { onSuccess, onError, immediate = false } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    isLoading: immediate,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      // Cancel previous request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const data = await fetcher(...args);
        setState({ data, isLoading: false, error: null });
        onSuccess?.(data);
        return data;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return null;
        }

        const error: ApiError = {
          message: err instanceof Error ? err.message : "An error occurred",
          status: (err as { status?: number })?.status,
        };

        setState({ data: null, isLoading: false, error });
        onError?.(error);
        return null;
      }
    },
    [fetcher, onSuccess, onError]
  );

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState({ data: null, isLoading: false, error: null });
  }, []);

  const setData = useCallback((data: T | null) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
  };
}

// ============================================
// Fetch Helper with Auth
// ============================================

interface FetchOptions extends RequestInit {
  timeout?: number;
  authToken?: string | null;
  useSessionAuth?: boolean;
}

export async function apiFetch<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    timeout = TIMEOUTS.API_TIMEOUT,
    authToken,
    useSessionAuth = false,
    headers: customHeaders = {},
    ...fetchOptions
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...customHeaders,
    };

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
      credentials: useSessionAuth ? "include" : "same-origin",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.error || errorData.message || `HTTP error ${response.status}`,
        status: response.status,
      };
    }

    const data = await response.json();
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================
// Mutation Hook (POST, PUT, DELETE)
// ============================================

interface UseMutationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
}

export function useMutation<T, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<T>,
  options: UseMutationOptions<T> = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [data, setData] = useState<T | null>(null);

  const mutate = useCallback(
    async (variables: TVariables): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await mutationFn(variables);
        setData(result);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error: ApiError = {
          message: err instanceof Error ? err.message : "An error occurred",
          status: (err as { status?: number })?.status,
        };
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [mutationFn, options]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    mutate,
    isLoading,
    error,
    data,
    reset,
  };
}

// ============================================
// Optimistic Update Hook
// ============================================

interface UseOptimisticOptions<T> {
  onMutate: (data: T) => T;
  onError: (data: T) => T;
  onSuccess?: (data: T) => void;
}

export function useOptimistic<T>(
  initialValue: T,
  options: UseOptimisticOptions<T>
) {
  const [value, setValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const previousValueRef = useRef<T>(initialValue);

  const mutate = useCallback(
    async (asyncFn: () => Promise<T>): Promise<T | null> => {
      previousValueRef.current = value;

      // Apply optimistic update
      const optimisticValue = options.onMutate(value);
      setValue(optimisticValue);
      setIsLoading(true);

      try {
        const result = await asyncFn();
        setValue(result);
        options.onSuccess?.(result);
        return result;
      } catch {
        // Rollback on error
        const rolledBack = options.onError(previousValueRef.current);
        setValue(rolledBack);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [value, options]
  );

  return {
    value,
    setValue,
    mutate,
    isLoading,
  };
}
