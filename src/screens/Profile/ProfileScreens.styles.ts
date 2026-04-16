import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

// eslint-disable-next-line react-native/no-unused-styles
export const createProfileStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: {flex: 1},
    background: {backgroundColor: theme.colors.background, flex: 1},

    // Avatar section
    avatarSection: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing['2xl'],
      ...theme.shadows.sm,
    },
    roleBadge: {
      borderRadius: theme.borderRadius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },

    // Info section
    section: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.md,
      ...theme.shadows.sm,
    },
    row: {
      alignItems: 'center',
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowLeft: {gap: theme.spacing.xs, flex: 1},
    input: {
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      color: theme.colors.text,
      flex: 1,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    editButton: {
      padding: theme.spacing.sm,
    },
    dangerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },

    // Settings
    sectionHeader: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
    },
    radioRow: {
      alignItems: 'center',
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    radioIndicator: {
      borderColor: theme.colors.primary,
      borderRadius: theme.borderRadius.pill,
      borderWidth: 2,
      height: 20,
      width: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioInner: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.pill,
      height: 10,
      width: 10,
    },
  });
