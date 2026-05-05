import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

// eslint-disable-next-line react-native/no-unused-styles
export const createCallsStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: {flex: 1},
    safeArea: {backgroundColor: theme.colors.primary, flex: 1},
    screenBackground: {backgroundColor: theme.colors.background, flex: 1},

    // Filter tabs
    tabRow: {
      backgroundColor: theme.colors.surface,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
    },
    tab: {
      alignItems: 'center',
      flex: 1,
      paddingVertical: theme.spacing.md,
    },
    tabActive: {
      borderBottomColor: theme.colors.accent,
      borderBottomWidth: 2,
    },

    // List
    listContent: {
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    emptyState: {
      alignItems: 'center',
      flex: 1,
      gap: theme.spacing.md,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing['3xl'],
      paddingTop: theme.spacing['6xl'],
    },

    // Skeleton
    skeletonItem: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    skeletonContent: {flex: 1, gap: theme.spacing.sm},

    // Incoming call screen
    incomingRoot: {
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      flex: 1,
      justifyContent: 'space-between',
      paddingBottom: theme.spacing['6xl'],
      paddingTop: theme.spacing['6xl'],
    },
    incomingCallerSection: {alignItems: 'center', gap: theme.spacing.lg},
    incomingLabel: {opacity: 0.75},
    incomingAvatarWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    incomingActionItem: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    pulseRing: {
      borderColor: theme.colors.accent,
      borderRadius: theme.borderRadius.pill,
      borderWidth: 2,
      position: 'absolute',
    },
    incomingActions: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing['6xl'],
      justifyContent: 'center',
    },
    callActionButton: {
      alignItems: 'center',
      borderRadius: theme.borderRadius.pill,
      height: theme.spacing['6xl'] + theme.spacing['2xl'],
      justifyContent: 'center',
      width: theme.spacing['6xl'] + theme.spacing['2xl'],
    },
    answerButton: {backgroundColor: theme.colors.success},
    declineButton: {backgroundColor: theme.colors.error},

    // Active call screen
    activeRoot: {
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      flex: 1,
      justifyContent: 'space-between',
      paddingBottom: theme.spacing['6xl'],
      paddingTop: theme.spacing['6xl'],
    },
    activeCallerSection: {alignItems: 'center', gap: theme.spacing.md},
    timerText: {
      fontVariant: ['tabular-nums'],
      letterSpacing: 2,
    },
    activeControls: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing['3xl'],
      justifyContent: 'center',
    },
    controlButton: {
      alignItems: 'center',
      borderRadius: theme.borderRadius.pill,
      gap: theme.spacing.xs,
      height: theme.spacing['6xl'],
      justifyContent: 'center',
      width: theme.spacing['6xl'],
    },
    controlButtonActive: {backgroundColor: theme.colors.surfaceAlt},
    controlButtonInactive: {backgroundColor: theme.colors.primary + '00'},
    endCallButton: {
      alignItems: 'center',
      backgroundColor: theme.colors.error,
      borderRadius: theme.borderRadius.pill,
      height: theme.spacing['6xl'] + theme.spacing['2xl'],
      justifyContent: 'center',
      width: theme.spacing['6xl'] + theme.spacing['2xl'],
    },
  });
