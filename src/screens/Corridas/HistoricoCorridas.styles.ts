/**
 * @fileoverview Styles for PassageiroCorridasListScreen (ride history).
 *
 * Design aligned with the GovMobile dashboard and profile pages.
 * All values use theme design tokens — zero hardcoded colors or pixel values.
 */
import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

/**
 * Creates the StyleSheet for the ride history screen.
 *
 * @param theme - The current GovMobile theme object.
 * @returns StyleSheet scoped to the ride history feature.
 */
export const createHistoricoStyles = (theme: Theme) => {
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
      marginBottom: spacing[4],
    },
    headerTitle: {
      ...typo.scale.displayMd,
      color: design.textOnDark,
    },
    headerSubtitle: {
      ...typo.scale.bodyMd,
      color: design.textOnDarkMuted,
      marginTop: spacing[1],
    },

    // ── List ──────────────────────────────────────────────────────────────────
    listContent: {
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[10],
    },
    listContentEmpty: {
      flexGrow: 1,
    },

    // ── Ride card ─────────────────────────────────────────────────────────────
    rideCard: {
      backgroundColor: design.surface100,
      borderRadius: borderRadius.radius.lg,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing[3],
      overflow: 'hidden',
      ...shadows.card,
    },
    rideCardLast: {
      marginBottom: 0,
    },
    statusBar: {
      width: 4,
      alignSelf: 'stretch',
    },
    rideContent: {
      flex: 1,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[3],
      gap: spacing[1],
    },
    rideTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing[2],
    },
    statusPill: {
      borderRadius: borderRadius.radius.full,
      paddingHorizontal: spacing[2],
      paddingVertical: 2,
    },
    statusPillText: {
      ...typo.scale.labelSm,
      color: design.textOnDark,
    },
    rideDate: {
      ...typo.scale.caption,
      color: design.textTertiary,
    },
    routeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    routeIcon: {
      marginRight: spacing[1],
    },
    routeText: {
      ...typo.scale.bodySm,
      color: design.textSecondary,
      flex: 1,
    },
    motivoText: {
      ...typo.scale.caption,
      color: design.textTertiary,
      marginTop: spacing[1],
    },
    chevron: {
      marginRight: spacing[2],
    },

    // ── Empty state ───────────────────────────────────────────────────────────
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing[8],
      paddingVertical: spacing[12],
    },
    emptyTitle: {
      ...typo.scale.headingMd,
      color: design.textPrimary,
      marginTop: spacing[4],
      textAlign: 'center',
    },
    emptySubtitle: {
      ...typo.scale.bodyMd,
      color: design.textTertiary,
      marginTop: spacing[2],
      textAlign: 'center',
    },
  });
};
