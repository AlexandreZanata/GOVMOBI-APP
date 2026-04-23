/**
 * @fileoverview Styles for the FilaEsperaCard molecule.
 *
 * Visual language: amber accent card with a progress indicator row,
 * consistent with the GovMobile design system tokens.
 */
import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

/**
 * Creates the StyleSheet for FilaEsperaCard.
 *
 * @param theme - The current GovMobile theme object.
 * @returns StyleSheet scoped to the FilaEspera feature.
 */
export const createFilaEsperaStyles = (theme: Theme) => {
  const {design, spacing, borderRadius, shadows, typography: typo} = theme;

  return StyleSheet.create({
    card: {
      backgroundColor: design.surface100,
      borderRadius: borderRadius.radius.lg,
      padding: spacing[4],
      marginHorizontal: spacing[4],
      marginBottom: spacing[3],
      borderLeftWidth: 4,
      borderLeftColor: design.amber500,
      ...shadows.card,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      marginBottom: spacing[3],
    },
    title: {
      ...typo.scale.headingSm,
      color: design.textPrimary,
      flex: 1,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing[3],
    },
    statBlock: {
      alignItems: 'center',
      flex: 1,
    },
    statValue: {
      ...typo.scale.displaySm,
      color: design.amber500,
    },
    statLabel: {
      ...typo.scale.caption,
      color: design.textTertiary,
      textAlign: 'center',
    },
    dividerV: {
      width: 1,
      backgroundColor: design.surface300,
      marginVertical: spacing[1],
    },
    estimativaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      paddingTop: spacing[2],
      borderTopWidth: 1,
      borderTopColor: design.surface300,
    },
    estimativaText: {
      ...typo.scale.bodySm,
      color: design.textSecondary,
      flex: 1,
    },
    dispatchBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      backgroundColor: design.surface200,
      borderRadius: borderRadius.radius.md,
      padding: spacing[3],
      marginHorizontal: spacing[4],
      marginBottom: spacing[3],
    },
    dispatchText: {
      ...typo.scale.bodySm,
      color: design.textSecondary,
      flex: 1,
    },
  });
};
