import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

// eslint-disable-next-line react-native/no-unused-styles
export const createFrotaStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: {flex: 1},
    background: {backgroundColor: theme.colors.background, flex: 1},

    // Tab switcher
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

    // Filter row
    filterRow: {
      backgroundColor: theme.colors.surface,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    filterChip: {
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.pill,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    filterChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },

    // List
    listContent: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    emptyState: {
      alignItems: 'center',
      flex: 1,
      gap: theme.spacing.md,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing['3xl'],
    },

    // Card
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      ...theme.shadows.sm,
    },
    cardRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    statusBadge: {
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    skeletonCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },
  });
