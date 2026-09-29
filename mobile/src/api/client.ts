import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ─── Base URL Configuration ─────────────────────────────────────────────────────
//
// Change this value depending on how you are running the app:
//
//  • Android Emulator:   'http://10.0.2.2:3000/api'
//    (10.0.2.2 is the special alias for the host machine's localhost)
//
//  • iOS Simulator:      'http://localhost:3000/api'
//    (localhost works because the simulator shares the Mac's network)
//
//  • Physical device via Expo Go:  'http://<YOUR_LOCAL_IP>:3000/api'
//    To find your local IP on Windows, open a terminal and run:
//       ipconfig
//    Look for "Wireless LAN adapter Wi-Fi" → "IPv4 Address" (e.g. 192.168.1.42).
//    Your phone and computer MUST be on the same Wi-Fi network.
//    Example: 'http://192.168.1.42:3000/api'
//
// ─────────────────────────────────────────────────────────────────────────────────

const BASE_URL = 'http://10.46.100.168:3000/api'; // ← UPDATE THIS if your IP changes (run `ipconfig` → Wi-Fi → IPv4)

const TOKEN_KEY = 'padosipro_auth_token';

// ─── Timeout ────────────────────────────────────────────────────────────────────
//
// WHY an AbortController *and* axios `timeout`?
//
// Axios's built-in `timeout` only starts counting once the HTTP response begins.
// On React Native, if the destination IP is unreachable (e.g. your laptop IP
// changed), the TCP SYN gets no reply and the OS keeps retrying the connection
// for 60–120 seconds.  During that time, the axios `timeout` timer has NOT
// started yet because no response has begun — so the promise hangs silently
// with no error.
//
// AbortController + setTimeout works at the XHR / fetch level and will abort the
// request even during the TCP connection phase, giving us a hard upper-bound on
// how long any request can take.  This is the real fix for the "nothing happens"
// bug: without it, a request to a stale IP hangs forever.
// ─────────────────────────────────────────────────────────────────────────────────

const REQUEST_TIMEOUT_MS = 10_000; // 10 seconds — hard ceiling for any request

// ─── Axios Instance ─────────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor ────────────────────────────────────────────────────────
// 1. Attaches the JWT from SecureStore on every outgoing request.
// 2. Sets up an AbortController so that requests to unreachable IPs are
//    forcibly aborted after REQUEST_TIMEOUT_MS (see comment above).

apiClient.interceptors.request.use(
  async (config) => {
    // ── Attach auth token ──
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // SecureStore may throw on certain platforms; fail silently here.
    }

    // ── AbortController-based hard timeout ──
    // Only add one if the caller hasn't already provided a signal.
    if (!config.signal) {
      const controller = new AbortController();
      config.signal = controller.signal;
      setTimeout(() => {
        controller.abort(
          new Error(
            `Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds. ` +
            `Check that your backend is running and BASE_URL (${BASE_URL}) is reachable from your device.`,
          ),
        );
      }, REQUEST_TIMEOUT_MS);
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Global UNAUTHORIZED Handler ────────────────────────────────────────────────
//
// Problem: When a JWT expires, ANY protected API call returns UNAUTHORIZED.
// We need to log the user out automatically when this happens.
//
// Challenge: This module can't import React context (circular dependency).
//
// Solution: AuthContext registers its signOut function here at mount time.
// The response interceptor calls it when it sees UNAUTHORIZED, clearing the
// token and resetting auth state which flips the navigator to AuthStack.
//
// The `sessionExpiredMessage` flag lets the Login screen show a brief
// "Your session expired" message so the user isn't confused about why
// they were kicked out.

/** Callback registered by AuthContext — called on UNAUTHORIZED */
let onUnauthorized: (() => void) | null = null;

/** Flag that Login screen reads to show "session expired" notice */
let sessionExpiredMessage: string | null = null;

/**
 * Called by AuthContext on mount to register its signOut function.
 * This is the bridge between the axios module and React state.
 */
export function registerUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

/** Read and clear the session-expired message (consumed once by Login) */
export function consumeSessionExpiredMessage(): string | null {
  const msg = sessionExpiredMessage;
  sessionExpiredMessage = null;
  return msg;
}

/**
 * RESPONSE INTERCEPTOR
 * Runs after every API response. On UNAUTHORIZED:
 *  1. Sets a user-facing message
 *  2. Calls the registered signOut callback (clears token + resets state)
 *  3. Still rejects the promise so the calling screen's catch block runs
 */
apiClient.interceptors.response.use(
  // Success — pass through unchanged
  (response) => response,
  // Error — check for UNAUTHORIZED
  async (error) => {
    const status = error.response?.status;
    const errorCode = error.response?.data?.error?.code;

    if (status === 401 || errorCode === 'UNAUTHORIZED') {
      sessionExpiredMessage = 'Your session expired. Please log in again.';
      if (onUnauthorized) {
        onUnauthorized();
      }
    }

    return Promise.reject(error);
  },
);

// ─── Token Helpers ──────────────────────────────────────────────────────────────

/** Save the JWT to secure storage */
export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

/** Remove the JWT (logout) */
export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/** Read the current JWT (or null) */
export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export default apiClient;

