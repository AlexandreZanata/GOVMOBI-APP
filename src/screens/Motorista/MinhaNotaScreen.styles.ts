/**
 * @fileoverview Styles for MinhaNotaScreen.
 *
 * All values use theme design tokens — zero hardcoded colors or pixel values.
 */
import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

/**
 * Creates the StyleSheet for the minha nota screen.
 *
 * @param theme - The current GovMobile theme object.
 * @returns StyleSheet scoped to the minha nota feature.
 */
export const createMinhaNotaStyles = (theme: Theme) => {
  const {design, spacing, borderRadius, shadows, typography: typo} = theme;

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: design.surface200,
    },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
      backgroundColor: design.navy800,
      paddingHorizontal: spacing[5],
      paddingTop: spacing[4],
      paddingBottom: spacing[6],
    },
    headerTitle: {
      ...typo.scale.displayMd,
      color: design.textOnDark,
    },

    // ── Content ───────────────────────────────────────────────────────────────
    content: {
      flex: 1,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[6],
    },

    // ── Summary card ──────────────────────────────────────────────────────────
    card: {
      backgroundColor: design.surface100,
      borderRadius: borderRadius.radius.lg,
      padding: spacing[6],
      ...shadows.card,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing[4],
    },
    rowLast: {
      marginBottom: 0,
    },
    label: {
      ...typo.scale.labelMd,
      color: design.textSecondary,
    },
    value: {
      ...typo.scale.displayMd,
      color: design.textPrimary,
    },

    // ── Centered states ───────────────────────────────────────────────────────
    centeredFill: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing[8],
    },
    emptyText: {
      ...typo.scale.bodyMd,
      color: design.textTertiary,
      textAlign: 'center',
      marginTop: spacing[4],
    },
    errorText: {
      ...typo.scale.bodyMd,
      color: design.danger,
      textAlign: 'center',
      marginBottom: spacing[4],
    },
    retryButton: {
      backgroundColor: design.navy700,
      borderRadius: borderRadius.radius.md,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[6],
    },
    retryButtonText: {
      ...typo.scale.labelLg,
      color: design.textOnDark,
    },
  });
};
