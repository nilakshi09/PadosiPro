/**
 * RegisterScreen — Real registration form connected to the backend.
 *
 * Features:
 * - react-hook-form + zod for client-side validation
 * - Inline validation on blur (not just on submit)
 * - Calls POST /api/auth/register on submit
 * - On success → navigates to VerifyOtp with the email
 * - On EMAIL_ALREADY_EXISTS → shows error under email field
 * - On VALIDATION_ERROR with fields → shows field-specific errors
 * - On network error → shows ErrorMessage with retry
 * - Keyboard: email no auto-capitalize, passwords secure with toggle
 */

import React, { useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Screen, Logo, Button, TextField, ErrorMessage } from '../../components';
import { register } from '../../api/authApi';
import { ApiError } from '../../types/api';
import { colors, spacing, typography } from '../../theme/theme';
import type { RegisterScreenProps } from '../../navigation/types';

// ─── Validation Schema ──────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'], // Show error on the confirm field
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// ─── Screen ─────────────────────────────────────────────────────────────────────

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  // Network error state (for non-field errors like timeout)
  const [networkError, setNetworkError] = useState<string | null>(null);
  // Tracks if we're currently submitting
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Store the last form data so we can retry on network failure
  const [lastFormData, setLastFormData] = useState<RegisterFormData | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
    // Validate on blur so errors appear as the user leaves each field
    mode: 'onBlur',
  });

  /**
   * Submit the registration form to the backend.
   * Handles all error cases from the backend contract.
   */
  async function onSubmit(data: RegisterFormData) {
    Keyboard.dismiss();
    setNetworkError(null);
    setIsSubmitting(true);
    setLastFormData(data);

    try {
      await register(data.email, data.password, data.confirmPassword);

      // Success — navigate to OTP verification with the registered email
      navigation.navigate('VerifyOtp', { email: data.email });
    } catch (error) {
      if (error instanceof ApiError) {
        switch (error.code) {
          case 'EMAIL_ALREADY_EXISTS':
            // Show under the email field
            setError('email', { message: 'An account with this email already exists' });
            break;

          case 'VALIDATION_ERROR':
            // Backend returned field-specific errors — map them to form fields
            if (error.fields) {
              Object.entries(error.fields).forEach(([field, message]) => {
                if (field === 'email' || field === 'password' || field === 'confirmPassword') {
                  setError(field, { message });
                }
              });
            } else {
              setNetworkError(error.message);
            }
            break;

          default:
            // Any other API error — show as generic error
            setNetworkError(error.message);
        }
      } else {
        // Completely unexpected error
        setNetworkError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  /** Retry the last submission (used by ErrorMessage's "Try Again" button) */
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
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>
            Create your PadosiPro account to get started
          </Text>
        </View>

        {/* Network error banner (only for non-field errors) */}
        {networkError && (
          <ErrorMessage message={networkError} onRetry={handleRetry} />
        )}

        {/* Form — only show when there's no network error taking up the space */}
        {!networkError && (
          <>
            <View style={styles.form}>
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
                    onChangeText={onChange}
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
                    placeholder="Create a strong password"
                    isPassword
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    returnKeyType="next"
                  />
                )}
              />

              {/* Confirm Password */}
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Confirm Password"
                    leftIcon="lock-outline"
                    placeholder="Re-enter your password"
                    isPassword
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.confirmPassword?.message}
                    returnKeyType="done"
                  />
                )}
              />
            </View>

            {/* Footer buttons */}
            <View style={styles.footer}>
              <Button
                title="Create Account"
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                disabled={isSubmitting}
              />
              <Button
                title="Already have an account? Log in"
                onPress={() => navigation.navigate('Login')}
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
  footer: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
