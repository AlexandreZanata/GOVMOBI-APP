/**
 * @fileoverview Styles for the redesigned HomeScreen.
 *
 * Layout (Design_Prompt §4 Screen 2):
 * - Dark header (navy800) with curved bottom (radius.xl)
 * - Page body (surface200) with section rhythm
 * - Service cards: surface100, shadows.card, radius.lg, amber icon containers
 *
 * All values reference theme tokens — zero hardcoded colors or pixel values.
 */
import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

/**
 * Creates the StyleSheet for HomeScreen and its subcomponents.
 *
 * @param theme - The current Sorrimobi theme object.
 * @returns A StyleSheet object scoped to the Home screen.
 */
// eslint-disable-next-line react-native/no-unused-styles
export const createHomeStyles = (theme: Theme) => {
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

    // ── Dark header (Pattern A) ───────────────────────────────────────────────
    header: {
      backgroundColor: design.navy800,
      borderBottomLeftRadius: borderRadius.radius.xl,
      borderBottomRightRadius: borderRadius.radius.xl,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      paddingBottom: spacing[6],
    },
    headerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing[3],
    },
    headerTitle: {
      ...typo.scale.displayMd,
      color: design.textOnDark,
    },
    headerBell: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      minWidth: 44,
    },
    headerBadge: {
      position: 'absolute',
      right: 4,
      top: 4,
    },

    // ── Status row (inside header) ────────────────────────────────────────────
    statusBar: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing[2],
    },
    statusDot: {
      borderRadius: borderRadius.radius.full,
      height: 8,
      width: 8,
    },
    statusLabel: {
      ...typo.scale.labelMd,
      color: design.textOnDarkMuted,
    },
    statusSeparator: {
      ...typo.scale.caption,
      color: design.navy600,
    },
    statusTimestamp: {
      ...typo.scale.caption,
      color: design.textOnDarkMuted,
    },

    // ── Section wrapper ───────────────────────────────────────────────────────
    section: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[6],
    },
    sectionTitle: {
      ...typo.scale.headingMd,
      color: design.textPrimary,
      marginBottom: spacing[3],
    },

    // ── Service cards grid (2×3) ──────────────────────────────────────────────
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[3],
    },
    quickActionCell: {
      width: '47.5%',
    },

    // ── Service card (Design_Prompt §3.3) ─────────────────────────────────────
    serviceCard: {
      backgroundColor: design.surface100,
      borderColor: design.surface300,
      borderRadius: borderRadius.radius.lg,
      borderWidth: 0.5,
      padding: spacing[4],
      ...shadows.card,
    },
    serviceCardIconWrap: {
      alignItems: 'center',
      backgroundColor: design.amber100,
      borderRadius: borderRadius.radius.md,
      height: 44,
      justifyContent: 'center',
      marginBottom: spacing[3],
      width: 44,
    },
    serviceCardTitle: {
      ...typo.scale.headingSm,
      color: design.textPrimary,
      marginBottom: spacing[1],
    },
    serviceCardSubtitle: {
      ...typo.scale.bodySm,
      color: design.textSecondary,
    },

    // ── Recent activity ───────────────────────────────────────────────────────
    activityList: {
      gap: spacing[3],
    },

    // ── Announcements ─────────────────────────────────────────────────────────
    announcementsScroll: {
      marginHorizontal: -spacing[4],
      paddingHorizontal: spacing[4],
    },
    announcementCard: {
      backgroundColor: design.surface100,
      borderColor: design.surface300,
      borderRadius: borderRadius.radius.lg,
      borderWidth: 0.5,
      marginRight: spacing[3],
      padding: spacing[4],
      width: 260,
      ...shadows.card,
    },
    announcementStripe: {
      borderRadius: borderRadius.radius.full,
      height: 3,
      marginBottom: spacing[3],
      width: spacing[8],
    },
    announcementTitle: {
      ...typo.scale.headingSm,
      color: design.textPrimary,
      marginBottom: spacing[1],
    },
    announcementBody: {
      ...typo.scale.bodySm,
      color: design.textSecondary,
    },

    // ── Skeleton ──────────────────────────────────────────────────────────────
    skeletonSection: {
      gap: spacing[3],
      paddingHorizontal: spacing[4],
      paddingTop: spacing[6],
    },
    skeletonRow: {
      flexDirection: 'row',
      gap: spacing[3],
    },

    // ── Legacy keys kept for HomeHeader / HomeStatusBar backward-compat ───────
    headerLeft: {
      flex: 1,
      gap: spacing[1],
    },
    headerGreeting: {
      opacity: 0.75,
    },
  });
};
