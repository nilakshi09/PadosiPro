/**
 * Navigation type definitions for the entire app.
 *
 * Split into two separate stacks:
 *   AuthStack — screens shown when NOT logged in (Register, VerifyOtp, Login)
 *   AppStack  — screens shown when logged in (ProfileSetup, TaskSelection, Home)
 *
 * The RootNavigator decides which stack to render based on AuthContext state.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// ─── Auth Stack (unauthenticated) ───────────────────────────────────────────────

export type AuthStackParamList = {
  Register: undefined;
  VerifyOtp: { email: string };
  Login: undefined;
};

// ─── App Stack (authenticated) ──────────────────────────────────────────────────

export type AppStackParamList = {
  ProfileSetup: undefined;
  TaskSelection: undefined;
  Home: undefined;
};

// ─── Screen prop types ──────────────────────────────────────────────────────────

export type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;
export type VerifyOtpScreenProps = NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>;
export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type ProfileSetupScreenProps = NativeStackScreenProps<AppStackParamList, 'ProfileSetup'>;
export type TaskSelectionScreenProps = NativeStackScreenProps<AppStackParamList, 'TaskSelection'>;
export type HomeScreenProps = NativeStackScreenProps<AppStackParamList, 'Home'>;

// ─── Legacy alias (keeps old imports working if anything references it) ─────────

/** @deprecated Use AuthStackParamList or AppStackParamList instead */
export type RootStackParamList = AuthStackParamList & AppStackParamList;
