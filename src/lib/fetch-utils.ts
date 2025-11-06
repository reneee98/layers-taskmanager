/**
 * Optimized fetch utilities with caching and duplicate call prevention
 */

interface CacheOptions {
  key: string;
  expiry?: number; // in milliseconds, default 5 minutes
  useCache?: boolean; // default true
}

interface FetchOptions extends Omit<RequestInit, 'cache'> {
  cache?: CacheOptions;
}

const DEFAULT_CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const activeFetches = new Map<string, Promise<Response>>();

/**
 * Get cached data from localStorage
 */
export function getCachedData<T>(key: string, expiry: number = DEFAULT_CACHE_EXPIRY): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const data: { value: T; timestamp: number } = JSON.parse(cached);
    const now = Date.now();
    
    if (now - data.timestamp < expiry) {
      return data.value;
    }
    
    // Cache expired, remove it
    localStorage.removeItem(key);
    return null;
  } catch (error) {
    console.error(`Error loading cache for ${key}:`, error);
    return null;
  }
}

/**
 * Save data to cache
 */
export function setCachedData<T>(key: string, value: T): void {
  try {
    const cacheData = {
      value,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error(`Error saving cache for ${key}:`, error);
  }
}

/**
 * Clear cache for a specific key
 */
export function clearCache(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error clearing cache for ${key}:`, error);
  }
}

/**
 * Optimized fetch with caching and duplicate call prevention
 */
export async function optimizedFetch<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  console.log(`[optimizedFetch] Fetching URL: ${url}`);
  
  const cacheOptions = options.cache;
  const cacheKey = cacheOptions?.key;
  const useCache = cacheOptions?.useCache !== false;
  const cacheExpiry = cacheOptions?.expiry || DEFAULT_CACHE_EXPIRY;
  
  // Try to load from cache first (optimistic loading)
  if (useCache && cacheKey) {
    const cached = getCachedData<T>(cacheKey, cacheExpiry);
    if (cached !== null) {
      console.log(`[optimizedFetch] Returning cached data for ${url}`);
      // Return cached data immediately, but continue fetching in background
      optimizedFetch(url, { ...options, cache: { ...cacheOptions, useCache: false } }).catch(() => {
        // Silently fail background refresh
      });
      return cached;
    }
  }
  
  // Prevent duplicate calls
  const fetchKey = `${url}:${JSON.stringify(options)}`;
  if (activeFetches.has(fetchKey)) {
    console.log(`[optimizedFetch] Duplicate call detected, reusing existing fetch for ${url}`);
    const response = await activeFetches.get(fetchKey)!;
    const data = await response.json();
    return data as T;
  }
  
  console.log(`[optimizedFetch] Making fetch call to ${url}`);
  // Remove our custom cache property before passing to fetch API
  // (fetch API has its own cache property which is a string enum)
  const { cache: _customCache, ...fetchOptions } = options;
  // Make the fetch call
  const fetchPromise = fetch(url, fetchOptions)
    .then(async (response) => {
      console.log(`[optimizedFetch] Response for ${url}: status ${response.status}, ok: ${response.ok}`);
    // Remove from active fetches
    activeFetches.delete(fetchKey);
    
    if (!response.ok) {
        console.error(`[optimizedFetch] HTTP error for ${url}: status ${response.status}`);
      // If we have cache, return it instead of throwing
      if (useCache && cacheKey) {
        const cached = getCachedData<T>(cacheKey, cacheExpiry);
        if (cached !== null) {
            console.log(`[optimizedFetch] Returning cached data due to error for ${url}`);
          return new Response(JSON.stringify(cached), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
      
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error(`[optimizedFetch] Error response body: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }
    
    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Response is not JSON");
    }
    
    return response;
    })
    .catch((error) => {
      console.error(`[optimizedFetch] Fetch error for ${url}:`, error);
      activeFetches.delete(fetchKey);
      throw error;
  });
  
  activeFetches.set(fetchKey, fetchPromise);
  
  const response = await fetchPromise;
  const data = await response.json();
  
  // Save to cache if successful
  if (useCache && cacheKey && data) {
    setCachedData(cacheKey, data);
  }
  
  return data as T;
}

/**
 * Batch fetch multiple URLs in parallel
 */
export async function batchFetch<T extends Record<string, any>>(
  requests: Array<{ key: string; url: string; options?: FetchOptions }>
): Promise<T> {
  const promises = requests.map(({ key, url, options }) =>
    optimizedFetch(url, options).then((data) => ({ key, data }))
  );
  
  const results = await Promise.all(promises);
  
  return results.reduce((acc, { key, data }) => {
    (acc as any)[key] = data;
    return acc;
  }, {} as T);
}

/**
 * Hook-like function for components to use optimized fetch
 */
export function useOptimizedFetch<T = any>(
  url: string | null,
  options: FetchOptions = {}
) {
  const cacheKey = options.cache?.key;
  
  // Return a function that can be called to fetch data
  return async (): Promise<T | null> => {
    if (!url) return null;
    
    try {
      return await optimizedFetch<T>(url, options);
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      
      // Try to return cached data on error
      if (cacheKey) {
        const cached = getCachedData<T>(cacheKey, options.cache?.expiry || DEFAULT_CACHE_EXPIRY);
        if (cached !== null) {
          return cached;
        }
      }
      
      return null;
    }
  };
}

