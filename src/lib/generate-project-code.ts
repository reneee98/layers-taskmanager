/**
 * Generates a project code from project name
 * Examples:
 * "E-shop" → "ESHOP-001"
 * "Web stránka" → "WEB-001" 
 * "Mobile App" → "MOBILE-001"
 * "API Development" → "API-001"
 */

export function generateProjectCode(name: string): string {
  if (!name || name.trim().length === 0) {
    return "";
  }

  // Clean the name: remove special characters, convert to uppercase
  const cleanName = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "") // Remove special characters except spaces
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim();

  // Split into words and take first 2-3 words max
  const words = cleanName.split(" ").filter(word => word.length > 0);
  
  if (words.length === 0) {
    return "";
  }

  // Take first 1-2 words and create abbreviation
  let abbreviation = "";
  if (words.length === 1) {
    // Single word: take first 4-6 characters
    abbreviation = words[0].substring(0, Math.min(6, words[0].length));
  } else if (words.length === 2) {
    // Two words: take first 2-3 characters from each
    abbreviation = words[0].substring(0, 3) + words[1].substring(0, 3);
  } else {
    // Multiple words: take first 2 characters from first two words
    abbreviation = words[0].substring(0, 2) + words[1].substring(0, 2);
  }

  // Ensure abbreviation is not too long (max 8 characters)
  abbreviation = abbreviation.substring(0, 8);

  return abbreviation;
}

/**
 * Generates a unique project code by checking existing codes
 * Returns code with next available number (001, 002, 003, ...)
 */
export function generateUniqueProjectCode(name: string, existingCodes: string[] = []): string {
  const baseCode = generateProjectCode(name);
  
  if (!baseCode) {
    return "";
  }

  // Find the highest number for this base code
  const pattern = new RegExp(`^${baseCode}-(\\d+)$`);
  let maxNumber = 0;

  for (const code of existingCodes) {
    const match = code.match(pattern);
    if (match) {
      const number = parseInt(match[1], 10);
      if (number > maxNumber) {
        maxNumber = number;
      }
    }
  }

  // Return next number with zero padding
  const nextNumber = maxNumber + 1;
  return `${baseCode}-${nextNumber.toString().padStart(3, "0")}`;
}

/**
 * Examples of generated codes:
 * "E-shop" → "ESHOP-001"
 * "Web stránka" → "WEB-001"
 * "Mobile App" → "MOBILE-001"
 * "API Development" → "API-001"
 * "CRM System" → "CRMSY-001"
 * "E-commerce Platform" → "ECOM-001"
 */
