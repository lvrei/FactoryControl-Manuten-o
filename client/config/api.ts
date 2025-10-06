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
    console.warn('⚠️ VITE_API_URL não configurado. Usando localhost.');
    return 'http://localhost:5000';
  }
  
  // Browser development - use relative URLs
  return '';
};

export const API_URL = getApiUrl();

/**
 * Create full API endpoint URL
 */
export const getApiEndpoint = (path: string): string => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // If API_URL is empty (browser), use relative URL
  if (!API_URL) {
    return `/${cleanPath}`;
  }
  
  // Return full URL
  return `${API_URL}/${cleanPath}`;
};

/**
 * Fetch wrapper that automatically handles API URL
 */
export const apiFetch = async (
  path: string,
  options?: RequestInit
): Promise<Response> => {
  const url = getApiEndpoint(path);
  return fetch(url, options);
};
