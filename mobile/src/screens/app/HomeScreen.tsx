/**
 * HomeScreen — Dashboard showing the user's selected tasks.
 *
 * Features:
 *  • Fetches selected tasks via GET /api/tasks/selection on mount
 *  • Displays tasks in a clean read-only list grouped by category
 *  • Greeting with the user's name (from AuthContext)
 *  • Logout button with native Alert confirmation
 *  • Loading/error/empty states for every network path
 *
 * If the user has no selected tasks (edge case), shows EmptyState
 * with a button to go back to TaskSelection.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen, Logo, LoadingSpinner, ErrorMessage, EmptyState, BackendUrlModal } from '../../components';
import { getSelection } from '../../api/tasksApi';
import { getProfile } from '../../api/profileApi';
import { ApiError } from '../../types/api';
import type { Task } from '../../types/api';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography, borderRadius } from '../../theme/theme';
import type { HomeScreenProps } from '../../navigation/types';

// ─── Types for SectionList ──────────────────────────────────────────────────────

interface TaskSection {
  title: string;
  data: Task[];
}

// ─── Screen ─────────────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { state, signOut, setUserName } = useAuth();

  // ── Data state ────────────────────────────────────────────────────────────
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBackendSettings, setShowBackendSettings] = useState(false);

  // ── User's display name ───────────────────────────────────────────────────
  // Prefer the name from AuthContext (set during profile setup in this session).
  // If not available (e.g. app was restarted), fetch from profile API.
  const userName = state.userName;

  // ── Fetch data on mount ───────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch in parallel: selection + profile (if we don't have the name)
      const promises: [Promise<any>, Promise<any>?] = [getSelection()];

      if (!userName) {
        promises.push(getProfile());
      }

      const [selectionRes, profileRes] = await Promise.all(promises as Promise<any>[]);

      // Process selection — group tasks by a "category" tag
      // The selection endpoint returns a flat list of tasks.
      // We'll display them as a simple list with a "Your Services" header.
      const tasks: Task[] = selectionRes.data.tasks || [];
      if (tasks.length > 0) {
        setSections([{ title: 'Your Services', data: tasks }]);
      } else {
        setSections([]);
      }

      // Set user name if we fetched the profile
      if (profileRes && profileRes.data?.name && !userName) {
        setUserName(profileRes.data.name);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load your dashboard. Check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [userName, setUserName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Logout with confirmation ──────────────────────────────────────────────

  function handleLogout() {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            // signOut() clears the token and resets auth state.
            // The navigator automatically switches to AuthStack.
          },
        },
      ],
      { cancelable: true },
    );
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  /** Render a single task row (read-only, no checkbox) */
  function renderTask({ item }: { item: Task }) {
    return (
      <View style={styles.taskRow}>
        {/* Green dot indicator */}
        <View style={styles.taskDot} />

        {/* Task info */}
        <View style={styles.taskInfo}>
          <Text style={styles.taskName}>{item.name}</Text>
          <Text style={styles.taskDescription} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
      </View>
    );
  }

  /** Render section header */
  function renderSectionHeader({ section }: { section: TaskSection }) {
    return (
      <View style={styles.sectionHeader}>
        <MaterialIcons name="checklist" size={18} color={colors.primary} />
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionCount}>{section.data.length}</Text>
      </View>
    );
  }

  // ── Full-screen states ────────────────────────────────────────────────────

  // Loading
  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  // Error
  if (error) {
    return (
      <Screen scrollable={false}>
        <ErrorMessage message={error} onRetry={loadData} />
      </Screen>
    );
  }

  // ── Greeting text ─────────────────────────────────────────────────────────
  const greeting = userName ? `Hello, ${userName}!` : 'Hello!';

  // ── Main content ──────────────────────────────────────────────────────────

  return (
    <Screen scrollable={false} noPadding>
      <View style={styles.container}>
        {/* Top bar: Logo + App name + Logout button */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Logo size={36} />
            <Text style={styles.appName}>PadosiPro</Text>
          </View>
          <View style={styles.topBarRight}>
            <Pressable
              onPress={() => setShowBackendSettings(true)}
              style={styles.logoutButton}
              hitSlop={8}
            >
              <MaterialIcons name="settings" size={22} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={handleLogout}
              style={styles.logoutButton}
              hitSlop={8}
            >
              <MaterialIcons name="logout" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Text style={styles.tagline}>Your neighborhood dashboard</Text>
        </View>

        {/* Empty state: no tasks selected */}
        {sections.length === 0 ? (
          <EmptyState
            icon="playlist-add"
            message="No services selected"
            subtitle="Pick the services you offer to get started."
            actionLabel="Select Services"
            onAction={() => navigation.navigate('TaskSelection')}
          />
        ) : (
          /* Task list */
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderTask}
            renderSectionHeader={renderSectionHeader as any}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>

      {/* Backend URL settings modal */}
      <BackendUrlModal
        visible={showBackendSettings}
        onSave={() => {
          setShowBackendSettings(false);
          // Reload data with new URL
          loadData();
        }}
        onCancel={() => setShowBackendSettings(false)}
      />
    </Screen>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appName: {
    ...typography.h3,
    color: colors.textPrimary,
    marginLeft: spacing.md,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  logoutButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
  },

  // Greeting
  greeting: {
    paddingHorizontal: spacing.screenHorizontal,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  greetingText: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodyMedium,
    color: colors.primary,
    flex: 1,
  },
  sectionCount: {
    ...typography.bodySm,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },

  // Task list
  listContent: {
    paddingBottom: spacing['2xl'],
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.screenHorizontal,
  },

  // Task row (read-only)
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.screenHorizontal,
    backgroundColor: colors.background,
  },
  taskDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    marginTop: spacing.sm, // align with first line of text
    marginRight: spacing.md,
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  taskDescription: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
