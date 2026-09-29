import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/theme';

// ─── Props ──────────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  /** Button label */
  title: string;
  /** Press handler */
  onPress: () => void;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Disabled state — greyed out, non-interactive */
  disabled?: boolean;
  /** Loading state — spinner replaces text, same button size */
  loading?: boolean;
  /** Additional styles applied to the outer Pressable */
  style?: ViewStyle;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant].container,
        pressed && !isDisabled && variantStyles[variant].pressed,
        isDisabled && variantStyles[variant].disabled,
        variant === 'primary' && !isDisabled && shadows.button,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.white : colors.primary}
        />
      ) : (
        <Text
          style={[
            styles.label,
            variantStyles[variant].label,
            isDisabled && variantStyles[variant].disabledLabel,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    width: '100%',
  },
  label: {
    ...typography.button,
    textAlign: 'center',
  },
});

/** Per-variant style overrides, kept separate for readability */
const variantStyles = {
  primary: StyleSheet.create({
    container: {
      backgroundColor: colors.primary,
    },
    pressed: {
      backgroundColor: colors.primaryDark,
      opacity: 0.92,
    },
    disabled: {
      backgroundColor: colors.disabled,
      ...shadows.none,
    },
    label: {
      color: colors.white,
    },
    disabledLabel: {
      color: colors.disabledText,
    },
  }),

  secondary: StyleSheet.create({
    container: {
      backgroundColor: colors.transparent,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    pressed: {
      backgroundColor: colors.primaryMuted,
    },
    disabled: {
      borderColor: colors.disabled,
    },
    label: {
      color: colors.primary,
    },
    disabledLabel: {
      color: colors.disabledText,
    },
  }),

  ghost: StyleSheet.create({
    container: {
      backgroundColor: colors.transparent,
    },
    pressed: {
      opacity: 0.6,
    },
    disabled: {},
    label: {
      color: colors.primary,
    },
    disabledLabel: {
      color: colors.disabledText,
    },
  }),
};
