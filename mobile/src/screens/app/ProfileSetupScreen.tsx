/**
 * ProfileSetupScreen — Collects user profile info after first login.
 *
 * Fields:
 *  • Full Name (required, min 2 chars)
 *  • Mobile Number (required, valid 10-digit Indian number)
 *  • Address (required, min 5 chars, multiline)
 *  • Business Name (optional)
 *
 * Validation uses react-hook-form + zod, same pattern as auth screens.
 * On submit → PUT /api/profile → navigate to TaskSelection.
 *
 * Mobile number handling:
 *  The user can type with or without +91 prefix. We normalize before
 *  sending: strip any +91, spaces, or dashes, then validate that
 *  the remaining digits are 10 chars starting with 6-9.
 *
 * Error handling:
 *  • VALIDATION_ERROR with fields → show field-level errors
 *  • Network error → ErrorMessage with retry (preserves form data)
 */

import React, { useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Screen, Logo, Button, TextField, ErrorMessage } from '../../components';
import { updateProfile } from '../../api/profileApi';
import { ApiError } from '../../types/api';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography } from '../../theme/theme';
import type { ProfileSetupScreenProps } from '../../navigation/types';

// ─── Mobile Number Normalization ────────────────────────────────────────────────

/**
 * Strips whitespace, dashes, and an optional +91 prefix from a
 * phone number string, returning just the 10-digit core number.
 */
function normalizeMobile(raw: string): string {
  // Remove spaces, dashes, parentheses
  let cleaned = raw.replace(/[\s\-()]/g, '');
  // Strip leading +91 or 91 country code if present
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length > 10) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
}

// ─── Validation Schema ──────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Name must be at least 2 characters'),
  mobileNumber: z
    .string()
    .min(1, 'Mobile number is required')
    // Custom validation: normalize first, then check 10 digits starting with 6-9
    .refine(
      (val) => {
        const digits = normalizeMobile(val);
        return /^[6-9]\d{9}$/.test(digits);
      },
      { message: 'Enter a valid 10-digit mobile number (starting with 6-9)' },
    ),
  address: z
    .string()
    .min(1, 'Address is required')
    .min(5, 'Address must be at least 5 characters'),
  businessName: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// ─── Screen ─────────────────────────────────────────────────────────────────────

export default function ProfileSetupScreen({ navigation }: ProfileSetupScreenProps) {
  const { setUserName } = useAuth();

  // Network error state
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastFormData, setLastFormData] = useState<ProfileFormData | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', mobileNumber: '', address: '', businessName: '' },
    mode: 'onBlur',
  });

  /**
   * Submit profile data to the backend.
   */
  async function onSubmit(data: ProfileFormData) {
    Keyboard.dismiss();
    setNetworkError(null);
    setIsSubmitting(true);
    setLastFormData(data);

    try {
      // Normalize mobile number before sending (strip +91, spaces, etc.)
      const normalizedMobile = normalizeMobile(data.mobileNumber);

      await updateProfile({
        name: data.name.trim(),
        mobileNumber: normalizedMobile,
        address: data.address.trim(),
        // Only include businessName if the user typed something
        ...(data.businessName?.trim()
          ? { businessName: data.businessName.trim() }
          : {}),
      });

      // Save the user's name in auth context for the Home screen greeting
      setUserName(data.name.trim());

      // Success → navigate to TaskSelection
      navigation.navigate('TaskSelection');
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'VALIDATION_ERROR' && error.fields) {
          // Map backend field errors onto the form
          Object.entries(error.fields).forEach(([field, message]) => {
            if (field === 'name' || field === 'mobileNumber' || field === 'address' || field === 'businessName') {
              setError(field, { message });
            }
          });
        } else {
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
          <Logo size={48} />
          <Text style={styles.title}>A few details</Text>
          <Text style={styles.subtitle}>
            Tell us a bit about yourself so we can personalize your experience
          </Text>
        </View>

        {/* Network error */}
        {networkError && (
          <ErrorMessage message={networkError} onRetry={handleRetry} />
        )}

        {/* Form */}
        {!networkError && (
          <>
            <View style={styles.form}>
              {/* Full Name */}
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Full Name"
                    leftIcon="person"
                    placeholder="John Doe"
                    autoCapitalize="words"
                    autoCorrect={false}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.name?.message}
                    returnKeyType="next"
                  />
                )}
              />

              {/* Mobile Number */}
              <Controller
                control={control}
                name="mobileNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Mobile Number"
                    leftIcon="phone"
                    placeholder="+91 98765 43210"
                    keyboardType="phone-pad"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.mobileNumber?.message}
                    returnKeyType="next"
                  />
                )}
              />

              {/* Address (multiline) */}
              <Controller
                control={control}
                name="address"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Address"
                    leftIcon="location-on"
                    placeholder="123 Green Lane, Apartment 4B"
                    multiline
                    numberOfLines={3}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.address?.message}
                    returnKeyType="next"
                  />
                )}
              />

              {/* Business Name (optional) */}
              <Controller
                control={control}
                name="businessName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Business Name (optional)"
                    leftIcon="business"
                    placeholder="My Awesome Shop"
                    autoCorrect={false}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.businessName?.message}
                    returnKeyType="done"
                  />
                )}
              />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Button
                title="Continue"
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
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
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
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
