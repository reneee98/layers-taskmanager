/**
 * Strips HTML tags from a string and returns plain text
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  
  // Create a temporary div element to parse HTML
  const temp = document.createElement("div");
  temp.innerHTML = html;
  
  // Get text content and clean up whitespace
  return temp.textContent || temp.innerText || "";
}

/**
 * Truncates text to a specified length and adds ellipsis
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (!text) return "";
  
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength).trim() + "...";
}

/**
 * Strips HTML and truncates text for previews
 */
export function getTextPreview(html: string, maxLength: number = 100): string {
  const plainText = stripHtml(html);
  return truncateText(plainText, maxLength);
}
