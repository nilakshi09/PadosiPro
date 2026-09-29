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

// ─── Axios Instance ─────────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor ────────────────────────────────────────────────────────
// Automatically attaches the JWT from SecureStore on every outgoing request.

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // SecureStore may throw on certain platforms; fail silently here.
    }
    return config;
  },
  (error) => Promise.reject(error),
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
