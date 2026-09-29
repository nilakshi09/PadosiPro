import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen, Logo, EmptyState } from '../../components';
import { colors, spacing, typography } from '../../theme/theme';
import type { HomeScreenProps } from '../../navigation/types';

export default function HomeScreen(_props: HomeScreenProps) {
  return (
    <Screen scrollable={false}>
      <View style={styles.topBar}>
        <Logo size={36} />
        <Text style={styles.appName}>PadosiPro</Text>
        <MaterialIcons name="notifications-none" size={24} color={colors.textSecondary} />
      </View>

      <View style={styles.greeting}>
        <Text style={styles.hello}>Hello!</Text>
        <Text style={styles.tagline}>Your neighborhood dashboard</Text>
      </View>

      <EmptyState
        icon="home"
        message="You're all set"
        subtitle="This is your home screen. Tasks, requests, and activity will appear here once we wire up the backend."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  appName: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
    marginLeft: spacing.md,
  },
  greeting: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  hello: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
