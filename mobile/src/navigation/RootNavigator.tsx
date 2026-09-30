/**
 * RootNavigator.tsx – Top-level navigation structure.
 *
 * Conditionally renders one of two stacks:
 *   • AuthStack  – Register → VerifyOtp → Login  (unauthenticated users)
 *   • AppStack   – ProfileSetup → TaskSelection → Home (authenticated)
 *
 * BOOT CHECK FOR RETURNING USERS:
 * When a user is logged in, we need to decide which screen to start on:
 *   • No profile yet → ProfileSetup (first-time setup)
 *   • Profile exists but no tasks selected → TaskSelection
 *   • Profile + tasks exist → Home (skip straight to the dashboard)
 *
 * We determine this by making two API calls (getProfile + getSelection)
 * on mount, before showing any app screen. During this check, a
 * LoadingSpinner is shown so the user doesn't see a flash of the wrong screen.
 *
 * This approach keeps the routing logic centralized in the navigator
 * rather than scattered across individual screens.
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, BackendUrlModal } from '../components';
import { getProfile } from '../api/profileApi';
import { getSelection } from '../api/tasksApi';
import { loadBackendUrl } from '../api/backendUrl';
import type { AuthStackParamList, AppStackParamList } from './types';

// Auth screens
import RegisterScreen from '../screens/auth/RegisterScreen';
import VerifyOtpScreen from '../screens/auth/VerifyOtpScreen';
import LoginScreen from '../screens/auth/LoginScreen';

// App screens
import ProfileSetupScreen from '../screens/app/ProfileSetupScreen';
import TaskSelectionScreen from '../screens/app/TaskSelectionScreen';
import HomeScreen from '../screens/app/HomeScreen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

/** Shared screen options — no header, dark background, slide transition */
const screenOptions = {
  headerShown: false as const,
  contentStyle: { backgroundColor: colors.background },
  animation: 'slide_from_right' as const,
};

/**
 * Auth flow — shown when the user is NOT logged in.
 * Register → VerifyOtp → Login
 */
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={screenOptions}>
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

/**
 * App flow — shown when the user IS logged in.
 *
 * The `initialRouteName` is determined by the boot check:
 *  • 'ProfileSetup' — new user, no profile yet
 *  • 'TaskSelection' — profile exists but no tasks selected
 *  • 'Home' — returning user with profile + tasks
 */
function AppNavigator({ initialRoute }: { initialRoute: keyof AppStackParamList }) {
  return (
    <AppStack.Navigator screenOptions={screenOptions} initialRouteName={initialRoute}>
      <AppStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <AppStack.Screen name="TaskSelection" component={TaskSelectionScreen} />
      <AppStack.Screen name="Home" component={HomeScreen} />
    </AppStack.Navigator>
  );
}

/**
 * Root navigator — switches between AuthStack and AppStack based on
 * auth state, and determines the correct initial screen for logged-in users.
 */
export default function RootNavigator() {
  const { state, setUserName } = useAuth();

  // Backend URL state: has the user configured it yet?
  const [backendUrlReady, setBackendUrlReady] = useState(false);
  const [showBackendSetup, setShowBackendSetup] = useState(false);

  // Load backend URL from AsyncStorage on mount
  useEffect(() => {
    async function initBackendUrl() {
      const hasSaved = await loadBackendUrl();
      if (!hasSaved) {
        // First launch — show the setup modal
        setShowBackendSetup(true);
      }
      // Always mark as ready — the cached URL is now either the saved
      // value or the default. The setup modal gates interaction separately.
      setBackendUrlReady(true);
    }
    initBackendUrl();
  }, []);

  // Boot check state: which screen should the AppStack start on?
  const [initialRoute, setInitialRoute] = useState<keyof AppStackParamList | null>(null);
  const [bootChecking, setBootChecking] = useState(false);

  /**
   * When the user is logged in, run a quick boot check:
   *  1. Try to fetch their profile
   *  2. If profile exists, try to fetch their task selection
   *  3. Set the initial route based on what we found
   *
   * This runs once after auth boot completes and the user is logged in.
   *
   * SAFETY: Each network call is wrapped in its own try/catch so that a
   * failure in one step doesn't prevent the app from finishing the boot
   * check. A hard 15-second safety timeout guarantees bootChecking always
   * resolves even if a promise hangs forever.
   */
  useEffect(() => {
    if (state.isLoading || !state.token || !backendUrlReady) {
      // Not ready yet, not logged in, or backend URL not loaded yet — reset boot state
      setInitialRoute(null);
      return;
    }

    let cancelled = false;

    async function checkOnboarding() {
      console.log('[RootNavigator] checkOnboarding() — START');
      setBootChecking(true);

      try {
        // ── Step 1: Check if profile has been completed ──
        let hasProfile = false;
        let profileName: string | null = null;

        try {
          console.log('[RootNavigator] checkOnboarding() — calling getProfile()...');
          const profile = await getProfile();
          console.log('[RootNavigator] checkOnboarding() — getProfile() returned:', profile?.data?.name ?? '<no name>');

          if (cancelled) return;

          if (profile?.data?.name) {
            hasProfile = true;
            profileName = profile.data.name;
          }
        } catch (profileErr) {
          console.warn('[RootNavigator] checkOnboarding() — getProfile() failed:', profileErr);
          // Treat profile-fetch failure as "no profile" — user lands on
          // ProfileSetup which will show its own error if the problem persists.
        }

        if (cancelled) return;

        if (!hasProfile) {
          console.log('[RootNavigator] checkOnboarding() — no profile → ProfileSetup');
          setInitialRoute('ProfileSetup');
          return;
        }

        // Profile exists — save the user's name for the greeting
        if (profileName) {
          setUserName(profileName);
        }

        // ── Step 2: Check if tasks are selected ──
        try {
          console.log('[RootNavigator] checkOnboarding() — calling getSelection()...');
          const selection = await getSelection();
          console.log('[RootNavigator] checkOnboarding() — getSelection() returned:', selection?.data?.tasks?.length ?? 0, 'tasks');

          if (cancelled) return;

          if (!selection.data.tasks || selection.data.tasks.length === 0) {
            console.log('[RootNavigator] checkOnboarding() — no tasks → TaskSelection');
            setInitialRoute('TaskSelection');
          } else {
            console.log('[RootNavigator] checkOnboarding() — profile + tasks exist → Home');
            setInitialRoute('Home');
          }
        } catch (selectionErr) {
          console.warn('[RootNavigator] checkOnboarding() — getSelection() failed:', selectionErr);
          // Profile exists but can't check tasks — default to TaskSelection
          if (!cancelled) {
            setInitialRoute('TaskSelection');
          }
        }
      } catch (err) {
        // Outer catch — shouldn't normally fire since inner catches handle each step
        console.warn('[RootNavigator] checkOnboarding() — unexpected error:', err);
        if (!cancelled) {
          setInitialRoute('ProfileSetup');
        }
      } finally {
        if (!cancelled) {
          console.log('[RootNavigator] checkOnboarding() — END (setting bootChecking = false)');
          setBootChecking(false);
        }
      }
    }

    // ── Safety-net timeout ──
    // If checkOnboarding() hangs (e.g. a promise never resolves despite
    // the AbortController timeout), force the app out of the spinner
    // after 15 seconds. 15 s > 10 s (apiClient timeout) + margin.
    //
    // Declared before calling checkOnboarding() so the async function
    // can clear it in its `finally` block once it completes normally.
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        console.error(
          '[RootNavigator] SAFETY TIMEOUT fired after 15 s — forcing boot check completion'
        );
        setInitialRoute((prev) => prev ?? 'ProfileSetup');
        setBootChecking(false);
      }
    }, 15_000);

    checkOnboarding().finally(() => {
      // Check completed (success or failure) — the safety net is no
      // longer needed. Clear it so it doesn't fire a stale error after
      // the boot check has already resolved.
      clearTimeout(safetyTimer);
    });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
    // DEPENDENCY NOTE: `setUserName` is intentionally EXCLUDED.
    // It's a dispatch wrapper whose reference identity changes whenever
    // AuthContext's `state` changes (the useMemo depends on `state`).
    // Including it here caused an infinite loop:
    //   effect runs → setUserName(name) → state changes → new setUserName
    //   ref → effect re-fires → repeat forever.
    // We only need to re-run when auth state genuinely changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isLoading, state.token, backendUrlReady]);

  // Still checking SecureStore for a token, or loading backend URL — show spinner
  if (state.isLoading || !backendUrlReady) {
    return <LoadingSpinner fullScreen />;
  }

  // Backend URL setup gate — shown on first launch before auth
  if (showBackendSetup) {
    return (
      <BackendUrlModal
        visible={true}
        isSetup={true}
        onSave={() => {
          setShowBackendSetup(false);
        }}
      />
    );
  }

  // Not logged in — show auth screens
  if (!state.token) {
    return (
      <NavigationContainer
        theme={navTheme}
      >
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  // Logged in but still running boot check — show loading spinner
  if (bootChecking || !initialRoute) {
    return <LoadingSpinner fullScreen />;
  }

  // Logged in and boot check complete — show app screens
  return (
    <NavigationContainer
      theme={navTheme}
    >
      <AppNavigator initialRoute={initialRoute} />
    </NavigationContainer>
  );
}

/**
 * Navigation theme — matches our dark design system.
 * Extracted to a constant to avoid re-creating the object on every render.
 */
const navTheme = {
  dark: true as const,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.primary,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '800' as const },
  },
};
