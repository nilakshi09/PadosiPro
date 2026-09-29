/**
 * AuthContext — Global authentication state for the app.
 *
 * WHY React Context + useReducer (not zustand)?
 * - The existing codebase uses zero external state libraries
 * - Auth state is simple: token + user + loading flag
 * - useReducer gives us predictable state transitions (important for auth)
 * - No extra dependency to install, explain, or maintain
 * - Zustand would be overkill here — it shines for complex, multi-slice stores
 *
 * WHAT THIS DOES:
 * 1. On app boot, checks SecureStore for an existing JWT.
 *    If found, restores the user as "logged in" (skips auth screens).
 *    If not, shows the auth flow.
 * 2. Exposes signIn(token, user) — called by LoginScreen after successful login.
 *    Saves the token to SecureStore and updates state immediately.
 * 3. Exposes signOut() — clears SecureStore and resets state.
 *    Navigation automatically switches to AuthStack because `user` becomes null.
 */

import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { saveToken, clearToken, getToken } from '../api/client';
import type { User } from '../types/api';

// ─── State Shape ────────────────────────────────────────────────────────────────

interface AuthState {
  /** True while we're checking SecureStore on app boot */
  isLoading: boolean;
  /** JWT token (null = not logged in) */
  token: string | null;
  /** Current user object (null = not logged in) */
  user: User | null;
}

const initialState: AuthState = {
  isLoading: true,
  token: null,
  user: null,
};

// ─── Actions ────────────────────────────────────────────────────────────────────

type AuthAction =
  | { type: 'RESTORE_TOKEN'; token: string; user: User }
  | { type: 'SIGN_IN'; token: string; user: User }
  | { type: 'SIGN_OUT' }
  | { type: 'BOOT_COMPLETE' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'RESTORE_TOKEN':
      // Boot found a valid token in SecureStore
      return { isLoading: false, token: action.token, user: action.user };

    case 'SIGN_IN':
      // User just logged in successfully
      return { isLoading: false, token: action.token, user: action.user };

    case 'SIGN_OUT':
      // User logged out or token was invalid
      return { isLoading: false, token: null, user: null };

    case 'BOOT_COMPLETE':
      // Boot finished but no valid token found
      return { ...state, isLoading: false };

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
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Boot-time: check SecureStore for an existing token
  useEffect(() => {
    async function bootstrap() {
      try {
        const storedToken = await getToken();

        if (storedToken) {
          // We have a token — we trust it for now.
          // A more robust approach would validate it against a /me endpoint,
          // but the backend doesn't have one yet. For now, if the token is
          // in SecureStore, we treat the user as logged in. If it's expired,
          // the next API call will fail and we can handle it then.
          //
          // We store a minimal user object. The full user data will come
          // from the profile setup step (not built yet).
          dispatch({
            type: 'RESTORE_TOKEN',
            token: storedToken,
            // Since we don't persist the full user object separately,
            // create a placeholder. The real user data comes from the
            // login response and lives in memory until we add profile caching.
            user: {
              id: '',
              email: '',
              isVerified: true,
              hasCompletedProfile: false,
            },
          });
        } else {
          dispatch({ type: 'BOOT_COMPLETE' });
        }
      } catch {
        // SecureStore read failed — treat as logged out
        dispatch({ type: 'BOOT_COMPLETE' });
      }
    }

    bootstrap();
  }, []);

  // Memoize the context value to avoid unnecessary re-renders
  const contextValue: AuthContextValue = React.useMemo(
    () => ({
      state,
      signIn: async (token: string, user: User) => {
        await saveToken(token);
        dispatch({ type: 'SIGN_IN', token, user });
      },
      signOut: async () => {
        await clearToken();
        dispatch({ type: 'SIGN_OUT' });
      },
    }),
    [state],
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
