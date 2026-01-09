import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const roundToDecimals = (value: number, decimals: number): number => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Removes HTML tags from a string
 * Works both on client and server side
 * @param html - String that may contain HTML tags
 * @returns String with HTML tags removed
 */
export const stripHtml = (html: string | null | undefined): string => {
  if (!html) return '';
  
  // If we're on the client side, use DOM parsing for better accuracy
  if (typeof document !== 'undefined') {
    try {
      const tmp = document.createElement('DIV');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    } catch (e) {
      // Fallback to regex if DOM parsing fails
    }
  }
  
  // Fallback: Use regex to remove HTML tags (works on both client and server)
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove style tags
    .replace(/<[^>]+>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .replace(/&[a-z]+;/gi, '') // Remove other HTML entities
    .trim();
};

/**
 * Truncates task title to a maximum length
 * @param title - Task title to truncate
 * @param maxLength - Maximum length (default: 50)
 * @returns Truncated title with ellipsis if needed
 */
export const truncateTaskTitle = (title: string | null | undefined, maxLength: number = 50): string => {
  if (!title) return '';
  const cleanTitle = stripHtml(title).trim();
  if (cleanTitle.length <= maxLength) return cleanTitle;
  // Find the last space before maxLength to avoid cutting words, but limit search to last 10 chars
  const truncated = cleanTitle.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ', maxLength - 10);
  // If we found a space and it's not too far from the end, use it
  const finalText = lastSpaceIndex > maxLength - 15 ? truncated.substring(0, lastSpaceIndex).trim() : truncated.trim();
  return finalText + '...';
};

/**
 * Returns the appropriate color class for margin value (4 color states)
 * @param marginValue - Margin percentage value
 * @returns Tailwind CSS classes for the margin color
 */
export const getMarginColor = (marginValue: number): string => {
  if (marginValue < 0) {
    // Negative margin - red
    return "text-[#e7000b] dark:text-red-500";
  } else if (marginValue >= 0 && marginValue < 15) {
    // Low margin (0-15%) - orange
    return "text-[#e17100] dark:text-orange-500";
  } else if (marginValue >= 15 && marginValue < 30) {
    // Medium margin (15-30%) - yellow/orange
    return "text-[#f59e0b] dark:text-yellow-500";
  } else {
    // High margin (>= 30%) - green
    return "text-[#10b981] dark:text-green-500";
  }
};

