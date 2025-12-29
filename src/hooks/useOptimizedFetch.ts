"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { optimizedFetch, getCachedData, clearCache } from "@/lib/fetch-utils";

interface UseOptimizedFetchOptions {
  cacheKey?: string;
  cacheExpiry?: number; // in milliseconds
  enabled?: boolean; // default true
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface UseOptimizedFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
}

/**
 * Hook for optimized fetching with caching and duplicate call prevention
 */
export function useOptimizedFetch<T = any>(
  url: string | null,
  options: UseOptimizedFetchOptions = {}
): UseOptimizedFetchResult<T> {
  const {
    cacheKey,
    cacheExpiry = 5 * 60 * 1000, // 5 minutes default
    enabled = true,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isFetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);
  
  // Store callbacks in refs to avoid dependency issues
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  
  // Update refs when callbacks change
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  // Memoize cache key and expiry to avoid recreating fetchData
  const memoizedCacheKey = useMemo(() => cacheKey, [cacheKey]);
  const memoizedCacheExpiry = useMemo(() => cacheExpiry, [cacheExpiry]);

  const fetchData = useCallback(async (useCache = true) => {
    if (!url || !enabled || isFetchingRef.current) {
      return;
    }

    // Try to load from cache first (optimistic loading)
    if (useCache && memoizedCacheKey) {
      const cached = getCachedData<T>(memoizedCacheKey, memoizedCacheExpiry);
      if (cached !== null) {
        setData(cached);
        setLoading(false);
        setError(null);
        // Continue to fetch fresh data in background
        fetchData(false).catch(() => {
          // Silently fail background refresh
        });
        return;
      }
    }

    try {
      isFetchingRef.current = true;
      if (!useCache) {
        setLoading(true);
      }

      const result = await optimizedFetch<T>(url, {
        cache: memoizedCacheKey
          ? {
              key: memoizedCacheKey,
              expiry: memoizedCacheExpiry,
              useCache: useCache,
            }
          : undefined,
      });

      setData(result);
      setError(null);
      onSuccessRef.current?.(result);
      hasFetchedRef.current = true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onErrorRef.current?.(error);

      // Try to return cached data on error
      if (memoizedCacheKey) {
        const cached = getCachedData<T>(memoizedCacheKey, memoizedCacheExpiry);
        if (cached !== null) {
          setData(cached);
          setError(null);
        }
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [url, enabled, memoizedCacheKey, memoizedCacheExpiry]);

  const refetch = useCallback(async () => {
    if (memoizedCacheKey) {
      clearCache(memoizedCacheKey);
    }
    hasFetchedRef.current = false; // Reset to allow refetch
    await fetchData(false);
  }, [memoizedCacheKey, fetchData]);

  const clearCacheData = useCallback(() => {
    if (memoizedCacheKey) {
      clearCache(memoizedCacheKey);
    }
  }, [memoizedCacheKey]);

  // Track previous url and enabled to detect changes
  const prevUrlRef = useRef<string | null>(null);
  const prevEnabledRef = useRef<boolean>(false);

  useEffect(() => {
    const urlChanged = prevUrlRef.current !== url;
    const enabledChanged = prevEnabledRef.current !== enabled;
    const urlBecameAvailable = !prevUrlRef.current && url; // Changed from null to string
    const enabledBecameTrue = !prevEnabledRef.current && enabled; // Changed from false to true
    
    // Update refs
    prevUrlRef.current = url;
    prevEnabledRef.current = enabled;

    if (url && enabled) {
      // Fetch if:
      // 1. We haven't fetched yet, OR
      // 2. URL changed from null to string (became available), OR
      // 3. Enabled changed from false to true
      if (!hasFetchedRef.current || urlBecameAvailable || enabledBecameTrue) {
        hasFetchedRef.current = false; // Reset to allow fetch
        fetchData(true);
      }
    } else if (!enabled) {
      setLoading(false);
      // Reset hasFetchedRef when disabled, so it can fetch again when enabled
      if (hasFetchedRef.current) {
        hasFetchedRef.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled]); // Only depend on url and enabled

  return {
    data,
    loading,
    error,
    refetch,
    clearCache: clearCacheData,
  };
}
