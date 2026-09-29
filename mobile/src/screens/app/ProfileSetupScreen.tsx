import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, Logo, Button, TextField } from '../../components';
import { colors, spacing, typography } from '../../theme/theme';
import type { ProfileSetupScreenProps } from '../../navigation/types';

export default function ProfileSetupScreen({ navigation }: ProfileSetupScreenProps) {
  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.header}>
          <Logo size={48} />
          <Text style={styles.title}>A few details</Text>
          <Text style={styles.subtitle}>
            Tell us a bit about yourself so we can personalize your experience
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Full Name"
            leftIcon="person"
            placeholder="John Doe"
            autoCapitalize="words"
          />
          <TextField
            label="Mobile Number"
            leftIcon="phone"
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
          />
          <TextField
            label="Address"
            leftIcon="location-on"
            placeholder="123 Green Lane, Apartment 4B"
          />
          <TextField
            label="Business Name"
            leftIcon="business"
            placeholder="My Awesome Shop"
          />
        </View>

        <View style={styles.footer}>
          <Button
            title="Continue"
            onPress={() => navigation.navigate('TaskSelection')}
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
