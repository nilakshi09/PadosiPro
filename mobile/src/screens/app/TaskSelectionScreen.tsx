/**
 * TaskSelectionScreen — Browse and select tasks from a categorized list.
 *
 * Features:
 *  • Fetches tasks via GET /api/tasks on mount, shows LoadingSpinner
 *  • Tasks displayed grouped by category with sticky section headers
 *  • Each task row shows name + description, tap to toggle selection
 *  • Search bar at top with 300ms debounce (server-side search)
 *  • Selected count badge visible at all times
 *  • "Confirm Selection" button at bottom, disabled when nothing selected
 *  • Saves selection via PUT /api/tasks/selection on confirm
 *  • Full loading/error/empty states throughout
 *  • User's selections are preserved if the save API call fails
 *
 * SEARCH APPROACH:
 * We use server-side search (re-fetch via ?search= param) because:
 *  • The backend can search across fields we might not have client-side
 *  • Avoids downloading the entire task catalog upfront
 *  • Debounced at 300ms so we don't flood the server
 *  • Tradeoff: slight delay on search, but more accurate results
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen, Button, LoadingSpinner, ErrorMessage, EmptyState } from '../../components';
import { getTasks, updateSelection } from '../../api/tasksApi';
import { ApiError } from '../../types/api';
import type { TaskCategory, Task } from '../../types/api';
import { colors, spacing, typography, borderRadius } from '../../theme/theme';
import type { TaskSelectionScreenProps } from '../../navigation/types';

// ─── Types for SectionList data ─────────────────────────────────────────────────

interface TaskSection {
  title: string; // category name
  data: Task[];  // tasks in this category
}

// ─── Screen ─────────────────────────────────────────────────────────────────────

export default function TaskSelectionScreen({ navigation }: TaskSelectionScreenProps) {
  // ── Data state ──────────────────────────────────────────────────────────────
  const [sections, setSections] = useState<TaskSection[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // ── Loading/error states ────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Debounce timer ref ──────────────────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch tasks from the backend ────────────────────────────────────────────

  const fetchTasks = useCallback(async (search?: string) => {
    // If there's a search query, show a subtle search indicator
    // instead of the full-screen loading spinner
    if (search !== undefined) {
      setIsSearching(true);
    } else {
      setIsLoading(true);
    }
    setFetchError(null);

    try {
      const response = await getTasks(search || undefined);
      const newSections: TaskSection[] = response.data.categories.map(
        (cat: TaskCategory) => ({
          title: cat.category,
          data: cat.tasks,
        }),
      );
      setSections(newSections);
    } catch (error) {
      if (error instanceof ApiError) {
        setFetchError(error.message);
      } else {
        setFetchError('Failed to load tasks. Check your connection.');
      }
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Search with debounce ──────────────────────────────────────────────────

  function handleSearchChange(text: string) {
    setSearchQuery(text);

    // Clear any pending debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the search at 300ms
    debounceRef.current = setTimeout(() => {
      fetchTasks(text.trim());
    }, 300);
  }

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // ── Toggle task selection ─────────────────────────────────────────────────

  function toggleTask(taskId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
    // Clear save error when user changes selection (stale message)
    if (saveError) setSaveError(null);
  }

  // ── Save selection ────────────────────────────────────────────────────────

  async function handleConfirm() {
    if (selectedIds.size === 0) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      await updateSelection(Array.from(selectedIds));
      // Success → navigate to Home
      navigation.navigate('Home');
    } catch (error) {
      // Don't clear selections on failure — the user shouldn't lose their work
      if (error instanceof ApiError) {
        setSaveError(error.message);
      } else {
        setSaveError('Failed to save selection. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  /** Render a single task row with checkbox */
  function renderTask({ item }: { item: Task }) {
    const isSelected = selectedIds.has(item.id);
    return (
      <Pressable
        style={[styles.taskRow, isSelected && styles.taskRowSelected]}
        onPress={() => toggleTask(item.id)}
      >
        {/* Checkbox icon */}
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && (
            <MaterialIcons name="check" size={16} color={colors.background} />
          )}
        </View>

        {/* Task info */}
        <View style={styles.taskInfo}>
          <Text style={styles.taskName}>{item.name}</Text>
          <Text style={styles.taskDescription} numberOfLines={1}>
            {item.description}
          </Text>
        </View>
      </Pressable>
    );
  }

  /** Render a sticky category header */
  function renderSectionHeader({ section }: { section: TaskSection }) {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
    );
  }

  // ── Full-screen states ────────────────────────────────────────────────────

  // Initial loading state
  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  // Initial fetch error (no data to show at all)
  if (fetchError && sections.length === 0) {
    return (
      <Screen scrollable={false}>
        <ErrorMessage
          message={fetchError}
          onRetry={() => fetchTasks()}
        />
      </Screen>
    );
  }

  // ── Main content ──────────────────────────────────────────────────────────

  const selectedCount = selectedIds.size;

  return (
    <Screen scrollable={false} noPadding>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Pick your services</Text>
          <Text style={styles.subtitle}>
            Select the tasks you're interested in
          </Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons
            name="search"
            size={20}
            color={colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {/* Clear button */}
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => {
                setSearchQuery('');
                fetchTasks();
              }}
              hitSlop={8}
            >
              <MaterialIcons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
          {/* Search loading indicator */}
          {isSearching && (
            <LoadingSpinner size="small" style={styles.searchSpinner} />
          )}
        </View>

        {/* Selected count badge */}
        {selectedCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {selectedCount} selected
            </Text>
          </View>
        )}

        {/* Save error banner (inline, doesn't replace the list) */}
        {saveError && (
          <View style={styles.saveErrorContainer}>
            <View style={styles.saveErrorBanner}>
              <Text style={styles.saveErrorText}>{saveError}</Text>
            </View>
          </View>
        )}

        {/* Search error banner (inline — shown when search fails but we have data) */}
        {fetchError && sections.length > 0 && (
          <View style={styles.saveErrorContainer}>
            <View style={styles.saveErrorBanner}>
              <Text style={styles.saveErrorText}>
                Search failed: {fetchError}
              </Text>
            </View>
          </View>
        )}

        {/* Task list grouped by category */}
        {sections.length === 0 && !isSearching ? (
          <EmptyState
            icon="search-off"
            message="No tasks found"
            subtitle={
              searchQuery
                ? `No tasks match "${searchQuery}". Try a different search.`
                : 'No tasks available right now.'
            }
          />
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderTask}
            renderSectionHeader={renderSectionHeader as any}
            stickySectionHeadersEnabled={true}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        {/* Confirm button — always visible at bottom */}
        <View style={styles.footer}>
          <Button
            title={
              selectedCount > 0
                ? `Confirm Selection (${selectedCount})`
                : 'Select tasks to continue'
            }
            onPress={handleConfirm}
            loading={isSaving}
            disabled={selectedCount === 0 || isSaving}
          />
        </View>
      </View>
    </Screen>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Search bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    height: 48,
    marginHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    height: '100%',
    padding: 0,
  },
  searchSpinner: {
    padding: 0,
    marginLeft: spacing.sm,
  },

  // Selected count
  countBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.sm,
  },
  countText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: '600',
  },

  // Save error (inline banner, not full-screen)
  saveErrorContainer: {
    paddingHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.sm,
  },
  saveErrorBanner: {
    backgroundColor: colors.errorMuted,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
  },
  saveErrorText: {
    ...typography.bodySm,
    color: colors.error,
    textAlign: 'center',
  },

  // Section list
  listContent: {
    paddingBottom: spacing.md,
  },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.screenHorizontal,
  },

  // Task row
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.screenHorizontal,
    backgroundColor: colors.background,
  },
  taskRowSelected: {
    backgroundColor: colors.primaryMuted,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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

  // Footer
  footer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
