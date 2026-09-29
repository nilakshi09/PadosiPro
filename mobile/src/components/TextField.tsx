import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme/theme';

// ─── Props ──────────────────────────────────────────────────────────────────────

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  /** Label displayed above the input */
  label: string;
  /** Left icon name (MaterialIcons) */
  leftIcon?: keyof typeof MaterialIcons.glyphMap;
  /** Show a password visibility toggle on the right */
  isPassword?: boolean;
  /** Error message — turns the border red and shows the message below */
  error?: string;
  /** Additional container styles */
  containerStyle?: ViewStyle;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function TextField({
  label,
  leftIcon,
  isPassword = false,
  error,
  containerStyle,
  // Destructure event handlers so they're NOT included in restInputProps
  // and can't accidentally overwrite the custom wrappers below.
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  ...restInputProps
}: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hidePassword, setHidePassword] = useState(true);

  const borderColor = error
    ? colors.borderError
    : isFocused
    ? colors.borderFocused
    : colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      <Text style={styles.label}>{label}</Text>

      {/* Input row */}
      <View style={[styles.inputWrapper, { borderColor }]}>
        {/* Left icon */}
        {leftIcon && (
          <MaterialIcons
            name={leftIcon}
            size={20}
            color={isFocused ? colors.primary : colors.textSecondary}
            style={styles.leftIcon}
          />
        )}

        {/* TextInput */}
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.primary}
          secureTextEntry={isPassword && hidePassword}
          onFocus={(e) => {
            setIsFocused(true);
            onFocusProp?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlurProp?.(e);
          }}
          {...restInputProps}
        />

        {/* Password toggle */}
        {isPassword && (
          <Pressable
            onPress={() => setHidePassword((prev) => !prev)}
            hitSlop={8}
            style={styles.rightIcon}
          >
            <MaterialIcons
              name={hidePassword ? 'visibility-off' : 'visibility'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
      </View>

      {/* Error message — height is always reserved to prevent layout jumps */}
      <View style={styles.errorContainer}>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.bodySm,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  leftIcon: {
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    height: '100%',
    padding: 0, // Reset default padding
  },
  rightIcon: {
    marginLeft: spacing.md,
    padding: spacing.xs,
  },
  errorContainer: {
    minHeight: 20, // Reserve space so layout doesn't jump
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
});
