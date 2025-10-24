/**
 * TinyJPG API integration for image compression
 * https://tinypng.com/developers
 */

export interface TinyJPGResponse {
  input: {
    size: number;
    type: string;
  };
  output: {
    size: number;
    type: string;
    width: number;
    height: number;
    ratio: number;
    url: string;
  };
}

export interface TinyJPGError {
  error: string;
  message: string;
}

/**
 * Compress image using TinyJPG API
 */
export async function compressImageWithTinyJPG(file: File): Promise<File> {
  // Check if it's an image file
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Check if TinyJPG API key is available
  const apiKey = process.env.TINYJPG_API_KEY;
  if (!apiKey) {
    console.warn('TinyJPG API key not found, using local compression');
    return file;
  }

  try {
    // Convert file to base64
    const base64 = await fileToBase64(file);
    
    // Call TinyJPG API
    const response = await fetch('https://api.tinify.com/shrink', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${apiKey}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: {
          data: base64
        }
      })
    });

    if (!response.ok) {
      const error: TinyJPGError = await response.json();
      throw new Error(`TinyJPG API error: ${error.message}`);
    }

    const result: TinyJPGResponse = await response.json();
    
    // Download compressed image
    const compressedResponse = await fetch(result.output.url);
    if (!compressedResponse.ok) {
      throw new Error('Failed to download compressed image');
    }

    const compressedBlob = await compressedResponse.blob();
    
    // Create new File object with compressed data
    const compressedFile = new File([compressedBlob], file.name, {
      type: result.output.type,
      lastModified: Date.now(),
    });

    console.log(`TinyJPG compression: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB (${Math.round(result.output.ratio * 100)}% reduction)`);
    
    return compressedFile;
  } catch (error) {
    console.error('TinyJPG compression failed:', error);
    // Fallback to local compression
    return file;
  }
}

/**
 * Convert File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/...;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Check if TinyJPG API is available
 */
export function isTinyJPGAvailable(): boolean {
  return !!process.env.TINYJPG_API_KEY;
}
