/**
 * @fileoverview Styles for AdminAvaliacoesScreen.
 *
 * All values use theme design tokens — zero hardcoded colors or pixel values.
 */
import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

/**
 * Creates the StyleSheet for the admin avaliacoes screen.
 *
 * @param theme - The current GovMobile theme object.
 * @returns StyleSheet scoped to the admin avaliacoes feature.
 */
export const createAdminAvaliacoesStyles = (theme: Theme) => {
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

    // ── List ──────────────────────────────────────────────────────────────────
    listContent: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      paddingBottom: spacing[10],
    },

    // ── Item card ─────────────────────────────────────────────────────────────
    card: {
      backgroundColor: design.surface100,
      borderRadius: borderRadius.radius.lg,
      padding: spacing[4],
      marginBottom: spacing[3],
      ...shadows.card,
    },
    cardLast: {
      marginBottom: 0,
    },
    starsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing[2],
    },
    notaLabel: {
      ...typo.scale.labelMd,
      color: design.textSecondary,
      marginRight: spacing[2],
    },
    comentario: {
      ...typo.scale.bodyMd,
      color: design.textPrimary,
      marginBottom: spacing[2],
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    metaLabel: {
      ...typo.scale.labelMd,
      color: design.textSecondary,
      marginRight: spacing[1],
    },
    metaValue: {
      ...typo.scale.caption,
      color: design.textTertiary,
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
