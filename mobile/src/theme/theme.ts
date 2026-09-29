/**
 * PadosiPro Design System — Single Source of Truth
 *
 * Every visual value in the app (color, spacing, radius, typography, shadow)
 * must be imported from here. No hardcoded values elsewhere.
 */

// ─── Colors ─────────────────────────────────────────────────────────────────────

export const colors = {
  /** Core brand palette */
  primary: '#22C55E',          // Emerald green — buttons, links, accents
  primaryDark: '#16A34A',      // Darker green — pressed states
  primaryMuted: 'rgba(34, 197, 94, 0.15)', // Green with low opacity — subtle highlights

  /** Backgrounds */
  background: '#0B0F0E',      // Near-black canvas
  surface: '#141A18',         // Cards, input fields, slightly elevated surfaces
  surfaceElevated: '#1C2422', // Modals, drop-downs, highest elevation

  /** Text */
  textPrimary: '#F5F5F4',    // Headings, body text
  textSecondary: '#9CA3AF',  // Subtitles, placeholders, muted labels
  textInverse: '#0B0F0E',   // Text on green buttons

  /** Borders */
  border: '#2A3330',          // Default subtle border
  borderFocused: '#22C55E',   // Focused input border
  borderError: '#EF4444',     // Invalid input border

  /** Semantic */
  error: '#EF4444',           // Error messages, destructive actions
  errorMuted: 'rgba(239, 68, 68, 0.15)',
  success: '#22C55E',         // Success messages (same as primary)
  successMuted: 'rgba(34, 197, 94, 0.15)',
  warning: '#F59E0B',         // Warnings
  info: '#3B82F6',            // Informational

  /** Misc */
  disabled: '#4B5553',        // Disabled button backgrounds
  disabledText: '#6B7876',    // Disabled button text
  overlay: 'rgba(0, 0, 0, 0.6)', // Modal overlays
  transparent: 'transparent',
  white: '#FFFFFF',
} as const;

// ─── Spacing ────────────────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  /** Horizontal screen margin — used by Screen component */
  screenHorizontal: 24,
} as const;

// ─── Border Radius ──────────────────────────────────────────────────────────────

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// ─── Typography ─────────────────────────────────────────────────────────────────

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodySm: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  button: {
    fontSize: 16,
    fontWeight: '700' as const,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
} as const;

// ─── Shadows / Elevation ────────────────────────────────────────────────────────

export const shadows = {
  /** Subtle elevation for cards */
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  /** Stronger elevation for buttons and CTAs */
  button: {
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  /** No shadow */
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;

// ─── Convenience re-export ──────────────────────────────────────────────────────

const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} as const;

export type Theme = typeof theme;

export default theme;
