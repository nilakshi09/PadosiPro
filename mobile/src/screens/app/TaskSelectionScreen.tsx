import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen, Logo, Button } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../theme/theme';
import type { TaskSelectionScreenProps } from '../../navigation/types';

const PLACEHOLDER_TASKS = [
  { id: '1', label: 'Plumbing', icon: 'plumbing' as const },
  { id: '2', label: 'Electrical', icon: 'electrical-services' as const },
  { id: '3', label: 'Cleaning', icon: 'cleaning-services' as const },
  { id: '4', label: 'Painting', icon: 'format-paint' as const },
];

export default function TaskSelectionScreen({ navigation }: TaskSelectionScreenProps) {
  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.header}>
          <Logo size={48} />
          <Text style={styles.title}>Pick your services</Text>
          <Text style={styles.subtitle}>
            Select the task categories you're interested in
          </Text>
        </View>

        <View style={styles.grid}>
          {PLACEHOLDER_TASKS.map((task) => (
            <View key={task.id} style={styles.card}>
              <View style={styles.iconCircle}>
                <MaterialIcons name={task.icon} size={28} color={colors.primary} />
              </View>
              <Text style={styles.cardLabel}>{task.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Button
            title="Continue"
            onPress={() => navigation.navigate('Home')}
          />
        </View>
      </View>
    </Screen>
  );
}

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
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.lg,
    flex: 1,
    alignContent: 'center',
  },
  card: {
    width: '46%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  footer: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
