import { NextRequest } from "next/server";

/**
 * Get the base URL for the application
 * Handles Vercel deployments correctly by checking environment variables
 * 
 * @param request - Optional NextRequest to get origin from
 * @returns The base URL (e.g., https://example.com)
 */
export function getBaseUrl(request?: NextRequest): string {
  // 1. Check for explicit NEXT_PUBLIC_APP_URL (highest priority)
  // This should be set in Vercel environment variables for production
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const url = process.env.NEXT_PUBLIC_APP_URL.trim();
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }

  // 2. On Vercel production, prefer VERCEL_URL
  // VERCEL_URL is available in all Vercel deployments
  if (process.env.VERCEL_URL) {
    const vercelUrl = process.env.VERCEL_URL.trim();
    // VERCEL_URL doesn't include protocol, so add https://
    // Remove any existing protocol if present
    const cleanUrl = vercelUrl.replace(/^https?:\/\//, '');
    return `https://${cleanUrl}`;
  }

  // 3. Fallback to request origin if available
  // This works for most cases but may not be accurate on Vercel
  if (request) {
    const origin = request.nextUrl.origin;
    // If origin looks like a Vercel preview URL, it's fine
    // Otherwise, prefer environment variables
    return origin;
  }

  // 4. Last resort: use localhost for development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  // 5. Final fallback (shouldn't happen in production)
  console.warn('getBaseUrl: No URL found, using fallback. Set NEXT_PUBLIC_APP_URL or VERCEL_URL environment variable.');
  return 'https://localhost:3000';
}

