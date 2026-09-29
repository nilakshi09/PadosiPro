import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme/theme';
import Button from './Button';

export interface ErrorMessageProps {
  /** Error message to display */
  message: string;
  /** Optional retry callback — shows a retry button when provided */
  onRetry?: () => void;
  /** Custom icon name (MaterialIcons) */
  icon?: keyof typeof MaterialIcons.glyphMap;
}

export default function ErrorMessage({
  message,
  onRetry,
  icon = 'error-outline',
}: ErrorMessageProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <MaterialIcons name={icon} size={40} color={colors.error} />
      </View>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button
          title="Try Again"
          onPress={onRetry}
          variant="secondary"
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.errorMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    minWidth: 160,
  },
});
