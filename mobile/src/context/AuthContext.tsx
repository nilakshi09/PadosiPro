/**
 * AuthContext — Global authentication state for the app.
 *
 * WHAT THIS DOES:
 * 1. On app boot, checks SecureStore for an existing JWT.
 *    If found, restores the user as "logged in" (skips auth screens).
 *    If not, shows the auth flow.
 * 2. Exposes signIn(token, user) — called by LoginScreen after successful login.
 *    Saves the token to SecureStore and updates state immediately.
 * 3. Exposes signOut() — clears SecureStore and resets state.
 *    Navigation automatically switches to AuthStack because `user` becomes null.
 * 4. Registers the signOut callback with the axios client so that a global
 *    UNAUTHORIZED interceptor can trigger logout from anywhere.
 * 5. Exposes setUserName() — called by ProfileSetupScreen after profile is saved,
 *    so the Home screen can greet the user by name.
 */

import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { saveToken, clearToken, getToken, registerUnauthorizedHandler } from '../api/client';
import type { User } from '../types/api';

// ─── State Shape ────────────────────────────────────────────────────────────────

interface AuthState {
  /** True while we're checking SecureStore on app boot */
  isLoading: boolean;
  /** JWT token (null = not logged in) */
  token: string | null;
  /** Current user object (null = not logged in) */
  user: User | null;
  /** User's display name (set after profile setup, used for greeting) */
  userName: string | null;
}

const initialState: AuthState = {
  isLoading: true,
  token: null,
  user: null,
  userName: null,
};

// ─── Actions ────────────────────────────────────────────────────────────────────

type AuthAction =
  | { type: 'RESTORE_TOKEN'; token: string; user: User }
  | { type: 'SIGN_IN'; token: string; user: User }
  | { type: 'SIGN_OUT' }
  | { type: 'BOOT_COMPLETE' }
  | { type: 'SET_USER_NAME'; userName: string };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'RESTORE_TOKEN':
      return { ...state, isLoading: false, token: action.token, user: action.user };

    case 'SIGN_IN':
      return { ...state, isLoading: false, token: action.token, user: action.user };

    case 'SIGN_OUT':
      // Clear everything on logout
      return { isLoading: false, token: null, user: null, userName: null };

    case 'BOOT_COMPLETE':
      return { ...state, isLoading: false };

    case 'SET_USER_NAME':
      return { ...state, userName: action.userName };

    default:
      return state;
  }
}

// ─── Context Shape ──────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Current auth state */
  state: AuthState;
  /** Call after successful login — persists token and updates state */
  signIn: (token: string, user: User) => Promise<void>;
  /** Call to log out — clears persisted token and resets state */
  signOut: () => Promise<void>;
  /** Call after profile setup to store the user's name for greeting */
  setUserName: (name: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Stable signOut callback that can be registered with the axios interceptor.
  // Uses useCallback so the reference doesn't change on every render.
  const signOut = useCallback(async () => {
    await clearToken();
    dispatch({ type: 'SIGN_OUT' });
  }, []);

  // Register the signOut callback with the axios client so the global
  // UNAUTHORIZED interceptor can trigger logout from any API call.
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      // Fire-and-forget — the interceptor doesn't await this
      signOut();
    });
  }, [signOut]);

  // Boot-time: check SecureStore for an existing token.
  //
  // SAFETY: We wrap the entire bootstrap in a hard timeout so that
  // even if SecureStore.getItemAsync hangs (platform quirk, corrupted
  // keychain, Expo Go issue), the app will always finish loading and
  // show the Login/Register screen within a few seconds.
  useEffect(() => {
    let resolved = false; // prevents double-dispatch from race between bootstrap and safety timeout

    async function bootstrap() {
      console.log('[AuthContext] bootstrap() — START');

      // ── Step 1: Read token from SecureStore ──
      let storedToken: string | null = null;
      try {
        console.log('[AuthContext] bootstrap() — reading SecureStore...');

        // Race against a timeout.  SecureStore uses the Android Keystore,
        // which can be genuinely slow on real devices (especially first
        // access after boot in Expo Go). 5 s was too aggressive and the
        // timeout was consistently winning the race, making the app always
        // treat the user as logged out.
        //
        // SECURITY TRADEOFF NOTE (AsyncStorage fallback):
        //   SecureStore encrypts values via the OS keychain/keystore.
        //   AsyncStorage stores values as plain-text JSON on disk.
        //   If SecureStore proves completely unreliable in your Expo Go
        //   environment, AsyncStorage would work more reliably, but the
        //   token would be readable by anyone with device access or a
        //   rooted phone. For development/testing this may be acceptable;
        //   for production builds (not Expo Go), SecureStore is correct.
        const SECURE_STORE_TIMEOUT_MS = 15_000; // 15 s — generous for slow Keystore
        let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

        const secureStoreStart = Date.now();
        console.log(`[AuthContext] SecureStore.getItemAsync() called at T+0ms`);

        storedToken = await Promise.race([
          // The real SecureStore call, with timestamp logging
          (async () => {
            const result = await getToken();
            const elapsed = Date.now() - secureStoreStart;
            console.log(
              `[AuthContext] SecureStore.getItemAsync() resolved at T+${elapsed}ms — ` +
              `result: ${result ? '<token present>' : 'null'}`
            );
            // Cancel the timeout since SecureStore resolved first
            if (timeoutHandle !== null) clearTimeout(timeoutHandle);
            return result;
          })(),
          // Timeout fallback
          new Promise<null>((resolve) => {
            timeoutHandle = setTimeout(() => {
              const elapsed = Date.now() - secureStoreStart;
              console.warn(
                `[AuthContext] SecureStore read TIMED OUT at T+${elapsed}ms ` +
                `(limit: ${SECURE_STORE_TIMEOUT_MS}ms) — treating as no token. ` +
                `This likely means the Android Keystore is hanging in Expo Go.`
              );
              resolve(null);
            }, SECURE_STORE_TIMEOUT_MS);
          }),
        ]);

        const totalElapsed = Date.now() - secureStoreStart;
        console.log(`[AuthContext] bootstrap() — SecureStore race settled at T+${totalElapsed}ms, result: ${storedToken ? '<token present>' : 'null'}`);
      } catch (err) {
        console.warn('[AuthContext] bootstrap() — SecureStore read failed:', err);
        // Fall through — storedToken stays null, user will see auth screens
      }

      // ── Step 2: Dispatch result ──
      if (resolved) return; // safety timeout already fired
      resolved = true;

      if (storedToken) {
        console.log('[AuthContext] bootstrap() — restoring session (token found)');
        dispatch({
          type: 'RESTORE_TOKEN',
          token: storedToken,
          user: {
            id: '',
            email: '',
            isVerified: true,
            hasCompletedProfile: false,
          },
        });
      } else {
        console.log('[AuthContext] bootstrap() — no token, showing auth screens');
        dispatch({ type: 'BOOT_COMPLETE' });
      }

      console.log('[AuthContext] bootstrap() — END');
    }

    // ── Global safety-net timeout ──
    // If bootstrap() somehow never resolves (shouldn't happen, but
    // defensive programming), force the app out of loading state.
    // Must be longer than SECURE_STORE_TIMEOUT_MS (15 s) to avoid
    // prematurely aborting a legitimate but slow Keystore read.
    //
    // Declared before calling bootstrap() so the async function's
    // .finally() handler can clear it once it completes normally.
    const safetyTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.error('[AuthContext] SAFETY TIMEOUT fired after 20 s — forcing BOOT_COMPLETE');
        dispatch({ type: 'BOOT_COMPLETE' });
      }
    }, 20_000);

    bootstrap().finally(() => {
      // Bootstrap completed (success or failure) — the safety net is
      // no longer needed. Clear it so it doesn't fire a stale error
      // after boot has already resolved.
      clearTimeout(safetyTimer);
    });

    return () => {
      clearTimeout(safetyTimer);
    };
  }, []);

  // Memoize the context value to avoid unnecessary re-renders
  const contextValue: AuthContextValue = React.useMemo(
    () => ({
      state,
      signIn: async (token: string, user: User) => {
        await saveToken(token);
        dispatch({ type: 'SIGN_IN', token, user });
      },
      signOut,
      setUserName: (name: string) => {
        dispatch({ type: 'SET_USER_NAME', userName: name });
      },
    }),
    [state, signOut],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Access auth state and actions from any component.
 * Must be used inside <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
