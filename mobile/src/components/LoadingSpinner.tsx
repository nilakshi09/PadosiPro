import React from 'react';
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, spacing } from '../theme/theme';

export interface LoadingSpinnerProps {
  /** Spinner size */
  size?: 'small' | 'large';
  /** Override spinner color */
  color?: string;
  /** If true, center the spinner in the full available space */
  fullScreen?: boolean;
  /** Additional container styles */
  style?: ViewStyle;
}

export default function LoadingSpinner({
  size = 'large',
  color = colors.primary,
  fullScreen = false,
  style,
}: LoadingSpinnerProps) {
  return (
    <View style={[fullScreen ? styles.fullScreen : styles.inline, style]}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  inline: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
});
