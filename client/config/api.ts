/**
 * API Configuration
 * Handles API URL based on environment (development vs production/APK)
 */

// Get API URL from environment or use default
const getApiUrl = (): string => {
  // Check if running as Capacitor app
  const isCapacitor = !!(window as any).Capacitor;

  // If environment variable is set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // If running as Capacitor app, you must set VITE_API_URL
  if (isCapacitor) {
    // Default to localhost for development
    // In production, this should be set via environment variable
    console.warn("⚠️ VITE_API_URL não configurado. Usando localhost.");
    return "http://localhost:5000";
  }

  // In production (static hosting like Netlify), default to Netlify Functions path
  if (import.meta.env.PROD) {
    return "/.netlify/functions/api";
  }

  // Browser development - use relative URLs
  return "";
};

export const API_URL = getApiUrl();

// Log configuration on startup (only in development)
if (import.meta.env.DEV) {
  console.log("🔧 API Configuration:", {
    API_URL: API_URL || "(using relative URLs)",
    isCapacitor: !!(window as any).Capacitor,
    envApiUrl: import.meta.env.VITE_API_URL || "(not set)",
  });
}

/**
 * Create full API endpoint URL
 */
export const getApiEndpoint = (path: string): string => {
  const clean = path.replace(/^\//, "");

  if (API_URL) {
    // Production (Netlify Functions): ensure we don't duplicate "/api"
    const noApi = clean.replace(/^(api\/)+/, "");
    const joined = `${API_URL}/${noApi}`.replace(/\/{2,}/g, "/");
    return joined;
  }

  // Dev (Vite + Express): ensure requests go through "/api" prefix
  const devPath = clean.startsWith("api/") ? clean : `api/${clean}`;
  return `/${devPath}`;
};

/**
 * Fetch wrapper that automatically handles API URL
 */
export const apiFetch = async (
  path: string,
  options?: RequestInit,
): Promise<Response> => {
  const url = getApiEndpoint(path);
  return fetch(url, options);
};
