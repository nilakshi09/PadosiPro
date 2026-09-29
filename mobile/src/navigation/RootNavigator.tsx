import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components';
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
 * ProfileSetup → TaskSelection → Home
 */
function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={screenOptions}>
      <AppStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <AppStack.Screen name="TaskSelection" component={TaskSelectionScreen} />
      <AppStack.Screen name="Home" component={HomeScreen} />
    </AppStack.Navigator>
  );
}

/**
 * Root navigator — switches between AuthStack and AppStack based on
 * real auth state from AuthContext.
 *
 * While the boot check is running (checking SecureStore), we show a
 * full-screen loading spinner so the user doesn't see a flash of the
 * wrong stack.
 */
export default function RootNavigator() {
  const { state } = useAuth();

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.background,
          text: colors.textPrimary,
          border: colors.border,
          notification: colors.primary,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '800' },
        },
      }}
    >
      {/* Boot check still running — show loading spinner */}
      {state.isLoading ? (
        <LoadingSpinner fullScreen />
      ) : state.token ? (
        /* Logged in — show app screens */
        <AppNavigator />
      ) : (
        /* Not logged in — show auth screens */
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
