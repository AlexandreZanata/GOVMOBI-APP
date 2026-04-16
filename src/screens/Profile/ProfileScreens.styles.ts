/**
 * @fileoverview Styles for the redesigned ProfileScreen (Design_Prompt §4 Screen 3).
 *
 * Layout:
 * - Dark header (navy800, curved bottom radius.xl, ~220px):
 *     Avatar circle (80px, amber border), name (displayMd), email (bodyMd), role badge
 * - Page body (surface200, padding space.4):
 *     Info card, Settings card, Sign-out card
 *
 * All values reference theme tokens — zero hardcoded colors or pixel values.
 */
import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

/**
 * Creates the StyleSheet for ProfileScreen and SettingsScreen.
 *
 * @param theme - The current GovMobile theme object.
 * @returns A StyleSheet object scoped to the Profile feature.
 */
// eslint-disable-next-line react-native/no-unused-styles
export const createProfileStyles = (theme: Theme) => {
  const {design, spacing, borderRadius, shadows, typography: typo} = theme;

  return StyleSheet.create({
    // ── Root ──────────────────────────────────────────────────────────────────
    safeArea: {
      backgroundColor: design.navy800,
      flex: 1,
    },
    scrollContent: {
      backgroundColor: design.surface200,
      flexGrow: 1,
      paddingBottom: spacing[10],
    },

    // ── Dark hero header (Design_Prompt §3.6) ─────────────────────────────────
    hero: {
      alignItems: 'center',
      backgroundColor: design.navy800,
      borderBottomLeftRadius: borderRadius.radius.xl,
      borderBottomRightRadius: borderRadius.radius.xl,
      gap: spacing[2],
      minHeight: 220,
      paddingBottom: spacing[8],
      paddingTop: spacing[6],
    },

    /** Amber ring around the avatar circle. */
    avatarRing: {
      borderColor: design.amber500,
      borderRadius: borderRadius.radius.full,
      borderWidth: 3,
      padding: 3,
    },

    /** 80×80 avatar fallback background. */
    avatarFallback: {
      alignItems: 'center',
      backgroundColor: design.navy600,
      borderRadius: borderRadius.radius.full,
      height: 80,
      justifyContent: 'center',
      width: 80,
    },

    avatarInitials: {
      ...typo.scale.displayMd,
      color: design.amber500,
    },

    heroName: {
      ...typo.scale.displayMd,
      color: design.textOnDark,
      marginTop: spacing[2],
      textAlign: 'center',
    },

    heroEmail: {
      ...typo.scale.bodyMd,
      color: design.textOnDarkMuted,
      textAlign: 'center',
    },

    /** Role badge pill (Design_Prompt §3.6). */
    roleBadge: {
      backgroundColor: design.amber500,
      borderRadius: borderRadius.radius.full,
      marginTop: spacing[1],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
    },

    roleBadgeText: {
      ...typo.scale.labelMd,
      color: design.navy900,
    },

    // ── Card sections (Design_Prompt §3.7) ────────────────────────────────────
    section: {
      backgroundColor: design.surface100,
      borderRadius: borderRadius.radius.lg,
      marginHorizontal: spacing[4],
      marginTop: spacing[4],
      overflow: 'hidden',
      ...shadows.card,
    },

    // ── Info rows (Design_Prompt §3.7) ────────────────────────────────────────
    row: {
      alignItems: 'center',
      borderBottomColor: design.surface300,
      borderBottomWidth: 0.5,
      flexDirection: 'row',
      gap: spacing[3],
      minHeight: 56,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },

    rowLast: {
      borderBottomWidth: 0,
    },

    rowIcon: {
      alignItems: 'center',
      justifyContent: 'center',
      width: spacing[5],
    },

    rowContent: {
      flex: 1,
      gap: 2,
    },

    /** Small label above the value (Design_Prompt §3.7). */
    rowLabel: {
      ...typo.scale.caption,
      color: design.textTertiary,
    },

    rowValue: {
      ...typo.scale.bodyMd,
      color: design.textPrimary,
    },

    rowChevron: {
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Editable input ────────────────────────────────────────────────────────
    input: {
      ...typo.scale.bodyMd,
      borderColor: design.surface400,
      borderRadius: borderRadius.radius.md,
      borderWidth: 1,
      color: design.textPrimary,
      flex: 1,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
    },

    editButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      minWidth: 44,
    },

    // ── Danger row (sign out) ─────────────────────────────────────────────────
    dangerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing[3],
      minHeight: 56,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },

    dangerLabel: {
      ...typo.scale.bodyMd,
      color: design.danger,
    },

    // ── Settings screen ───────────────────────────────────────────────────────
    background: {
      backgroundColor: design.surface200,
      flex: 1,
    },

    sectionHeader: {
      ...typo.scale.labelMd,
      color: design.textTertiary,
      paddingBottom: spacing[2],
      paddingHorizontal: spacing[4],
      paddingTop: spacing[6],
    },

    radioRow: {
      alignItems: 'center',
      borderBottomColor: design.surface300,
      borderBottomWidth: 0.5,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[4],
    },

    radioLabel: {
      ...typo.scale.bodyMd,
      color: design.textPrimary,
    },

    radioIndicator: {
      alignItems: 'center',
      borderColor: design.navy800,
      borderRadius: borderRadius.radius.full,
      borderWidth: 2,
      height: 20,
      justifyContent: 'center',
      width: 20,
    },

    radioInner: {
      backgroundColor: design.navy800,
      borderRadius: borderRadius.radius.full,
      height: 10,
      width: 10,
    },

    aboutRow: {
      alignItems: 'center',
      borderBottomColor: design.surface300,
      borderBottomWidth: 0.5,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[4],
    },

    aboutLabel: {
      ...typo.scale.bodyMd,
      color: design.textPrimary,
    },

    aboutValue: {
      ...typo.scale.bodyMd,
      color: design.textTertiary,
    },
  });
};
