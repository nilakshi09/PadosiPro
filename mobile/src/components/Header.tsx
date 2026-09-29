import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme/theme';

export interface HeaderProps {
  /** Screen title */
  title: string;
  /** Show back button */
  showBack?: boolean;
  /** Back button press handler */
  onBack?: () => void;
  /** Optional right-side action */
  rightElement?: React.ReactNode;
}

export default function Header({
  title,
  showBack = false,
  onBack,
  rightElement,
}: HeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {showBack && (
          <Pressable
            onPress={onBack}
            style={styles.backButton}
            hitSlop={8}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={colors.textPrimary}
            />
          </Pressable>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{rightElement}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  left: {
    width: 40,
    alignItems: 'flex-start',
  },
  right: {
    width: 40,
    alignItems: 'flex-end',
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
});
