import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

// eslint-disable-next-line react-native/no-unused-styles
export const createNotificationsStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: {flex: 1},
    /** Dark blue safe area — matches the brand. */
    background: {backgroundColor: theme.colors.primary, flex: 1},
    listContent: {
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
    },
    emptyState: {
      alignItems: 'center',
      flex: 1,
      gap: theme.spacing.md,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing['3xl'],
    },
    skeletonItem: {
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      gap: theme.spacing.md,
      padding: theme.spacing.md,
    },
    skeletonContent: {flex: 1, gap: theme.spacing.sm},
    markAllButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    titleRow: {
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    contentArea: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
  });
