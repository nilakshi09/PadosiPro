/**
 * VerifyOtpScreen — OTP verification connected to the backend.
 *
 * Flow:
 * 1. On mount → automatically calls sendOtp() (user just registered)
 * 2. User enters 6-digit code → calls verifyOtp()
 * 3. On success → navigates to Login screen
 *
 * WHY navigate to Login after verification (not ProfileSetup)?
 * - The user doesn't have a JWT yet — they need to actually log in
 * - Login gives them a token, which the auth context uses to switch stacks
 * - Skipping login would mean we'd need a special "just-verified" token flow
 * - This is the simplest correct approach: verify email → log in → app
 *
 * Error handling:
 * - OTP_COOLDOWN_ACTIVE → countdown timer disabling resend button
 * - OTP_INVALID → shows attempts remaining
 * - OTP_EXPIRED → message prompting resend
 * - OTP_MAX_ATTEMPTS_EXCEEDED → message forcing fresh resend
 * - ALREADY_VERIFIED → auto-navigate to Login
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { Screen, Logo, Button, TextField, ErrorMessage } from '../../components';
import { sendOtp, verifyOtp } from '../../api/authApi';
import { ApiError } from '../../types/api';
import { colors, spacing, typography } from '../../theme/theme';
import type { VerifyOtpScreenProps } from '../../navigation/types';

// ─── Screen ─────────────────────────────────────────────────────────────────────

export default function VerifyOtpScreen({ navigation, route }: VerifyOtpScreenProps) {
  const email = route.params.email;

  // OTP code input
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  // Loading states for submit and resend separately
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Network error (for unexpected failures)
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Cooldown timer for resend button (in seconds)
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // OTP expiry info from the sendOtp response
  const [expiresInMinutes, setExpiresInMinutes] = useState<number | null>(null);

  // Track if OTP was already sent (to prevent duplicate auto-sends)
  const hasSentRef = useRef(false);

  // ─── Cooldown Timer Logic ───────────────────────────────────────────────────

  /** Start a countdown from `seconds` to 0 */
  const startCooldown = useCallback((seconds: number) => {
    // Clear any existing timer
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current);
    }

    setCooldown(seconds);

    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          // Timer hit 0 — clear the interval
          if (cooldownRef.current) {
            clearInterval(cooldownRef.current);
            cooldownRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
      }
    };
  }, []);

  // ─── Send OTP (auto-send on mount + manual resend) ──────────────────────────

  const handleSendOtp = useCallback(async () => {
    setNetworkError(null);
    setCodeError(null);
    setIsSending(true);

    try {
      const response = await sendOtp(email);
      setExpiresInMinutes(response.data.expiresInMinutes);
      // Start a default 60s cooldown after successful send
      startCooldown(60);
    } catch (error) {
      if (error instanceof ApiError) {
        switch (error.code) {
          case 'OTP_COOLDOWN_ACTIVE':
            // Backend tells us how many seconds remain
            if (error.secondsRemaining) {
              startCooldown(error.secondsRemaining);
            } else {
              // Fallback: if secondsRemaining isn't provided, use 60s
              startCooldown(60);
            }
            break;

          case 'ALREADY_VERIFIED':
            // User is already verified — skip straight to login
            navigation.navigate('Login');
            return;

          default:
            setNetworkError(error.message);
        }
      } else {
        setNetworkError('Failed to send verification code. Check your connection.');
      }
    } finally {
      setIsSending(false);
    }
  }, [email, navigation, startCooldown]);

  // Auto-send OTP on mount (user just registered)
  useEffect(() => {
    if (!hasSentRef.current) {
      hasSentRef.current = true;
      handleSendOtp();
    }
  }, [handleSendOtp]);

  // ─── Verify OTP ─────────────────────────────────────────────────────────────

  async function handleVerify() {
    Keyboard.dismiss();

    // Client-side: must be exactly 6 digits
    if (code.length !== 6) {
      setCodeError('Enter the 6-digit code from your email');
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setCodeError('Code must be 6 digits');
      return;
    }

    setCodeError(null);
    setNetworkError(null);
    setIsVerifying(true);

    try {
      await verifyOtp(email, code);
      // Success — navigate to Login
      navigation.navigate('Login');
    } catch (error) {
      if (error instanceof ApiError) {
        switch (error.code) {
          case 'OTP_INVALID':
            // Show attempts remaining so the user knows how many tries are left
            if (error.attemptsRemaining !== undefined) {
              setCodeError(
                `Invalid code. ${error.attemptsRemaining} attempt${error.attemptsRemaining === 1 ? '' : 's'} remaining.`,
              );
            } else {
              setCodeError('Invalid code. Please check and try again.');
            }
            break;

          case 'OTP_EXPIRED':
            setCodeError('This code has expired. Tap "Resend Code" to get a new one.');
            setCode(''); // Clear the expired code
            break;

          case 'OTP_MAX_ATTEMPTS_EXCEEDED':
            setCodeError('Too many failed attempts. Tap "Resend Code" to get a fresh code.');
            setCode(''); // Clear the old code
            break;

          default:
            setNetworkError(error.message);
        }
      } else {
        setNetworkError('Verification failed. Check your connection and try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  }

  // ─── Resend Button Text ─────────────────────────────────────────────────────

  const resendDisabled = cooldown > 0 || isSending;
  const resendTitle = cooldown > 0
    ? `Resend in ${cooldown}s`
    : isSending
      ? 'Sending...'
      : 'Resend Code';

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Screen>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Logo size={56} />
          <Text style={styles.title}>Enter OTP</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit code to{' '}
            <Text style={styles.email}>{email}</Text>.
            {expiresInMinutes
              ? ` It expires in ${expiresInMinutes} minutes.`
              : ' Check your inbox.'}
          </Text>
        </View>

        {/* Network error */}
        {networkError && (
          <ErrorMessage
            message={networkError}
            onRetry={handleSendOtp}
          />
        )}

        {/* Form */}
        {!networkError && (
          <>
            <View style={styles.form}>
              <TextField
                label="Verification Code"
                leftIcon="verified-user"
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                value={code}
                onChangeText={(text) => {
                  // Only allow digits
                  const digits = text.replace(/[^0-9]/g, '');
                  setCode(digits);
                  // Clear error when user starts typing again
                  if (codeError) setCodeError(null);
                }}
                error={codeError ?? undefined}
                returnKeyType="done"
                onSubmitEditing={handleVerify}
              />

              {/* Resend button with cooldown */}
              <Button
                title={resendTitle}
                onPress={handleSendOtp}
                variant="ghost"
                disabled={resendDisabled}
              />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Button
                title="Verify & Continue"
                onPress={handleVerify}
                loading={isVerifying}
                disabled={isVerifying || code.length !== 6}
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
    paddingHorizontal: spacing.lg,
  },
  email: {
    color: colors.primary,
    fontWeight: '600',
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
