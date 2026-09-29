/**
 * LoginScreen — Real login form connected to the backend.
 *
 * Features:
 * - react-hook-form + zod for client-side validation
 * - Calls POST /api/auth/login on submit
 * - On success → saves token to SecureStore via AuthContext.signIn(),
 *   which automatically flips navigation to AppStack
 * - On EMAIL_NOT_VERIFIED → navigates to VerifyOtp with email pre-filled
 * - On INVALID_CREDENTIALS → generic "Invalid email or password" message
 *   (doesn't reveal which field was wrong for security)
 * - On network error → ErrorMessage with retry
 * - Keyboard: email no auto-capitalize, password secure with toggle
 */

import React, { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Screen, Logo, Button, TextField, ErrorMessage } from '../../components';
import { login } from '../../api/authApi';
import { ApiError } from '../../types/api';
import { consumeSessionExpiredMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography } from '../../theme/theme';
import type { LoginScreenProps } from '../../navigation/types';

// ─── Validation Schema ──────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─── Screen ─────────────────────────────────────────────────────────────────────

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { signIn } = useAuth();

  // Generic credential error (shown as a banner, NOT on a specific field)
  const [authError, setAuthError] = useState<string | null>(null);
  // Network error (for unexpected failures)
  const [networkError, setNetworkError] = useState<string | null>(null);
  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Store last form data for retry
  const [lastFormData, setLastFormData] = useState<LoginFormData | null>(null);

  // On mount, check if the user was redirected here due to session expiry.
  // The UNAUTHORIZED interceptor in client.ts sets this message when it
  // triggers a forced logout, so we can show a clear explanation.
  useEffect(() => {
    const expiredMsg = consumeSessionExpiredMessage();
    if (expiredMsg) {
      setAuthError(expiredMsg);
    }
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  /**
   * Submit login credentials to the backend.
   */
  async function onSubmit(data: LoginFormData) {
    Keyboard.dismiss();
    setAuthError(null);
    setNetworkError(null);
    setIsSubmitting(true);
    setLastFormData(data);

    try {
      const response = await login(data.email, data.password);

      // Success — store token and update auth context.
      // This will trigger RootNavigator to switch from AuthStack to AppStack.
      await signIn(response.data.token, response.data.user);
    } catch (error) {
      if (error instanceof ApiError) {
        switch (error.code) {
          case 'INVALID_CREDENTIALS':
            // Generic message — don't reveal whether email or password was wrong
            setAuthError('Invalid email or password');
            break;

          case 'EMAIL_NOT_VERIFIED':
            // Navigate to verification with the email pre-filled
            // so the user can complete verification from the login flow too
            navigation.navigate('VerifyOtp', { email: data.email });
            break;

          default:
            setNetworkError(error.message);
        }
      } else {
        setNetworkError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  /** Retry the last submission */
  function handleRetry() {
    if (lastFormData) {
      onSubmit(lastFormData);
    }
  }

  return (
    <Screen>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Logo size={56} />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to your PadosiPro account
          </Text>
        </View>

        {/* Network error (full-screen style with retry) */}
        {networkError && (
          <ErrorMessage message={networkError} onRetry={handleRetry} />
        )}

        {/* Form */}
        {!networkError && (
          <>
            <View style={styles.form}>
              {/* Auth error banner (invalid credentials) — shown above the form */}
              {authError && (
                <View style={styles.authErrorBanner}>
                  <Text style={styles.authErrorText}>{authError}</Text>
                </View>
              )}

              {/* Email */}
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Email Address"
                    leftIcon="email"
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      // Clear auth error when user edits (stale message)
                      if (authError) setAuthError(null);
                    }}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    returnKeyType="next"
                  />
                )}
              />

              {/* Password */}
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Password"
                    leftIcon="lock"
                    placeholder="Enter your password"
                    isPassword
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      if (authError) setAuthError(null);
                    }}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onSubmit)}
                  />
                )}
              />
            </View>

            {/* Footer buttons */}
            <View style={styles.footer}>
              <Button
                title="Sign In"
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                disabled={isSubmitting}
              />
              <Button
                title="Don't have an account? Register"
                onPress={() => navigation.navigate('Register')}
                variant="ghost"
                disabled={isSubmitting}
              />
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: spacing['3xl'],
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  form: {
    flex: 1,
    justifyContent: 'center',
  },
  authErrorBanner: {
    backgroundColor: colors.errorMuted,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.sm,
    marginBottom: spacing.lg,
  },
  authErrorText: {
    ...typography.bodySm,
    color: colors.error,
    textAlign: 'center',
  },
  footer: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
