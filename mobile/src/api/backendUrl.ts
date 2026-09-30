/**
 * backendUrl.ts — Runtime backend URL configuration.
 *
 * Stores the user-chosen backend URL in AsyncStorage so the app can connect
 * to any backend instance without rebuilding. The URL is loaded once at app
 * startup and cached in memory for synchronous access by the axios client.
 *
 * Default: http://10.0.2.2:3000/api  (Android emulator → host machine)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'padosipro_backend_url';
const DEFAULT_URL = 'http://10.0.2.2:3000/api';

/** In-memory cache — set once at boot, updated when user changes the URL */
let cachedUrl: string = DEFAULT_URL;

/** Whether the URL has been loaded from storage at least once */
let initialized = false;

/**
 * Load the backend URL from AsyncStorage into memory.
 * Called once at app startup before any API calls.
 * Returns `true` if a URL was previously saved, `false` if using the default.
 */
export async function loadBackendUrl(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      cachedUrl = stored;
      initialized = true;
      return true;
    }
  } catch (err) {
    console.warn('[backendUrl] Failed to read from AsyncStorage:', err);
  }
  initialized = true;
  return false;
}

/**
 * Get the current backend URL (synchronous — reads from memory cache).
 * Falls back to the default if loadBackendUrl() hasn't been called yet.
 */
export function getBackendUrl(): string {
  return cachedUrl;
}

/**
 * Save a new backend URL to AsyncStorage and update the in-memory cache.
 * The axios client picks this up on the next request via its request interceptor.
 */
export async function setBackendUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  // Ensure the URL ends with /api
  const normalized = trimmed.replace(/\/+$/, ''); // strip trailing slashes
  const finalUrl = normalized.endsWith('/api') ? normalized : `${normalized}/api`;

  await AsyncStorage.setItem(STORAGE_KEY, finalUrl);
  cachedUrl = finalUrl;
}

/** Whether the backend URL has been loaded from storage */
export function isInitialized(): boolean {
  return initialized;
}

/** The default URL constant, exposed for the UI placeholder */
export { DEFAULT_URL };
