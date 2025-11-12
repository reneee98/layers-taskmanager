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

  // 2. Use request origin if available (most reliable on Vercel)
  // This will always be the correct domain the request came from
  // On Vercel production, this will be the production URL (e.g., layers-studio.vercel.app)
  if (request) {
    const origin = request.nextUrl.origin;
    // Use the origin from the request - this will be the actual domain
    return origin;
  }

  // 3. Fallback to VERCEL_URL if available (for cases without request)
  // VERCEL_URL is available in all Vercel deployments
  if (process.env.VERCEL_URL) {
    const vercelUrl = process.env.VERCEL_URL.trim();
    // VERCEL_URL doesn't include protocol, so add https://
    // Remove any existing protocol if present
    const cleanUrl = vercelUrl.replace(/^https?:\/\//, '');
    return `https://${cleanUrl}`;
  }

  // 4. Last resort: use localhost for development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  // 5. Final fallback (shouldn't happen in production)
  console.warn('getBaseUrl: No URL found, using fallback. Set NEXT_PUBLIC_APP_URL or VERCEL_URL environment variable.');
  return 'https://localhost:3000';
}

