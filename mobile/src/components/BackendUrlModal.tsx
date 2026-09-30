/**
 * BackendUrlModal — Allows the user to configure the backend URL at runtime.
 *
 * Shown as a full-screen modal (or inline setup screen) where the user enters
 * the URL of their backend. Pre-filled with a sensible default for Android
 * emulator. Includes helper text explaining how to find your local IP.
 *
 * Used in two contexts:
 *  1. First launch — shown before Register/Login as a setup gate
 *  2. Settings — opened from the gear icon on HomeScreen
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/theme';
import { getBackendUrl, setBackendUrl, DEFAULT_URL } from '../api/backendUrl';

export interface BackendUrlModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Called after the user saves a URL. The parent should hide the modal. */
  onSave: (url: string) => void;
  /** Called when the user dismisses without saving (only in settings mode) */
  onCancel?: () => void;
  /**
   * If true, this is the first-launch setup — no cancel button, must save.
   * If false, shown as a settings modal with a cancel option.
   */
  isSetup?: boolean;
}

export default function BackendUrlModal({
  visible,
  onSave,
  onCancel,
  isSetup = false,
}: BackendUrlModalProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pre-fill with current URL when modal opens
  useEffect(() => {
    if (visible) {
      const current = getBackendUrl();
      // Strip /api suffix for cleaner display
      const display = current.replace(/\/api\/?$/, '');
      setUrl(display);
      setError(null);
    }
  }, [visible]);

  async function handleSave() {
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please enter a backend URL');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setBackendUrl(trimmed);
      onSave(trimmed);
    } catch (err) {
      setError('Failed to save URL. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // Strip /api from DEFAULT_URL for display in placeholder
  const defaultDisplay = DEFAULT_URL.replace(/\/api\/?$/, '');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={isSetup ? undefined : onCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialIcons name="dns" size={48} color={colors.primary} />
          <Text style={styles.title}>
            {isSetup ? 'Backend Setup' : 'Backend URL'}
          </Text>
          <Text style={styles.subtitle}>
            {isSetup
              ? 'Before you begin, tell the app where your backend server is running.'
              : 'Change the backend server URL. The app will use this for all API calls.'}
          </Text>
        </View>

        {/* Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Backend URL</Text>
          <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
            <MaterialIcons
              name="link"
              size={20}
              color={colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={(text) => {
                setUrl(text);
                if (error) setError(null);
              }}
              placeholder={defaultDisplay}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={handleSave}
              selectTextOnFocus
            />
          </View>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
        </View>

        {/* Helper text */}
        <View style={styles.helperBox}>
          <MaterialIcons name="info-outline" size={16} color={colors.primary} />
          <Text style={styles.helperText}>
            If using a <Text style={styles.bold}>physical device</Text>, enter
            your computer's local network IP (run{' '}
            <Text style={styles.code}>ipconfig</Text> on Windows or{' '}
            <Text style={styles.code}>ifconfig</Text> on Mac/Linux to find it).{' '}
            Example: http://192.168.1.42:3000{"\n\n"}
            If using an <Text style={styles.bold}>Android emulator</Text>, the
            default <Text style={styles.code}>10.0.2.2</Text> usually works.
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
              saving && styles.saveButtonDisabled,
              !saving && shadows.button,
            ]}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : isSetup ? 'Save & Continue' : 'Save'}
            </Text>
          </Pressable>

          {!isSetup && onCancel && (
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing['3xl'],
    justifyContent: 'flex-start',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  inputSection: {
    marginBottom: spacing.lg,
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
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  inputError: {
    borderColor: colors.borderError,
  },
  inputIcon: {
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    height: '100%',
    padding: 0,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  helperBox: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  helperText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  code: {
    fontFamily: 'monospace',
    color: colors.primary,
    fontWeight: '500',
  },
  buttons: {
    gap: spacing.md,
  },
  saveButton: {
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonPressed: {
    backgroundColor: colors.primaryDark,
    opacity: 0.92,
  },
  saveButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  saveButtonText: {
    ...typography.button,
    color: colors.white,
  },
  cancelButton: {
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonPressed: {
    opacity: 0.6,
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.primary,
  },
});
