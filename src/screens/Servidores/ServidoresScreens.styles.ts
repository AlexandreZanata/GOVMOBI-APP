import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

// eslint-disable-next-line react-native/no-unused-styles
export const createServidoresStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: {flex: 1},
    background: {backgroundColor: theme.colors.background, flex: 1},

    // List
    listContent: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    filterRow: {
      backgroundColor: theme.colors.surface,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
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
      flexDirection: 'row',
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      ...theme.shadows.sm,
    },
    cardContent: {flex: 1, gap: theme.spacing.xs},
    cardRow: {flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm},
    statusDot: {
      borderRadius: theme.borderRadius.pill,
      height: 8,
      width: 8,
    },

    // Detail
    detailSection: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      gap: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.md,
      padding: theme.spacing.lg,
      ...theme.shadows.sm,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.xs,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    papeisBadgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    papelBadge: {
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    avatarSection: {
      alignItems: 'center',
      paddingVertical: theme.spacing['2xl'],
      gap: theme.spacing.md,
    },
  });
