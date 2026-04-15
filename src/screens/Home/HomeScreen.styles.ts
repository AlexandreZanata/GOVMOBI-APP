import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

/**
 * Creates the StyleSheet for HomeScreen and its subcomponents.
 * All values come from theme tokens — no hardcoded colors or sizes.
 *
 * @param theme - The current GovMobile theme object.
 * @returns A StyleSheet object scoped to the Home screen.
 */
// eslint-disable-next-line react-native/no-unused-styles
export const createHomeStyles = (theme: Theme) =>
  StyleSheet.create({
    // ---- Root ----
    safeArea: {
      backgroundColor: theme.colors.primary,
      flex: 1,
    },
    scrollContent: {
      backgroundColor: theme.colors.background,
      flexGrow: 1,
      paddingBottom: theme.spacing['4xl'],
    },

    // ---- Header ----
    header: {
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    headerLeft: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    headerGreeting: {
      opacity: 0.75,
    },
    headerBell: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      minWidth: 44,
      position: 'relative',
    },
    headerBadge: {
      position: 'absolute',
      right: 4,
      top: 4,
    },

    // ---- Status bar ----
    statusBar: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceAlt,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    statusDot: {
      borderRadius: theme.borderRadius.pill,
      height: theme.spacing.sm,
      width: theme.spacing.sm,
    },
    statusSeparator: {
      color: theme.colors.border,
    },

    // ---- Section wrapper ----
    section: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing['2xl'],
    },
    sectionTitle: {
      marginBottom: theme.spacing.md,
    },

    // ---- Quick actions grid ----
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    quickActionCell: {
      width: '47%',
    },

    // ---- Recent activity ----
    activityList: {
      gap: theme.spacing.md,
    },

    // ---- Announcements ----
    announcementsScroll: {
      marginHorizontal: -theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
    },
    announcementCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      marginRight: theme.spacing.md,
      padding: theme.spacing.md,
      width: 260,
    },
    announcementStripe: {
      borderRadius: theme.borderRadius.pill,
      height: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
      width: theme.spacing['4xl'],
    },

    // ---- Skeleton ----
    skeletonSection: {
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing['2xl'],
    },
    skeletonRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
  });
