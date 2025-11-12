// Utility to get app version from package.json
// This will be resolved at build time

let cachedVersion: string = '1.0.0';

export const getAppVersion = (): string => {
  if (cachedVersion !== '1.0.0') {
    return cachedVersion;
  }

  // Try to get from process.env first (set during build)
  if (process.env.NEXT_PUBLIC_APP_VERSION) {
    cachedVersion = process.env.NEXT_PUBLIC_APP_VERSION;
    return cachedVersion;
  }

  // Fallback to reading package.json (only works in Node.js, not in browser)
  if (typeof window === 'undefined') {
    try {
      const packageJson = require('../../package.json');
      cachedVersion = packageJson.version || '1.0.0';
      return cachedVersion;
    } catch (error) {
      cachedVersion = '1.0.0';
      return cachedVersion;
    }
  }

  // Browser fallback
  return cachedVersion;
};

