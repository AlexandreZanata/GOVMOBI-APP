import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

// eslint-disable-next-line react-native/no-unused-styles
export const createProfileStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: {flex: 1},

    /** Dark blue safe area — matches the brand header. */
    safeArea: {
      backgroundColor: theme.colors.primary,
      flex: 1,
    },

    /** Light background for the scrollable content below the hero. */
    scrollContent: {
      backgroundColor: theme.colors.background,
      flexGrow: 1,
      paddingBottom: theme.spacing['4xl'],
    },

    // ---- Hero header (dark blue band) ----
    hero: {
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing['3xl'],
      paddingTop: theme.spacing.xl,
    },
    avatarRing: {
      borderColor: theme.colors.accent,
      borderRadius: theme.borderRadius.pill,
      borderWidth: 3,
      padding: 3,
    },
    heroName: {
      marginTop: theme.spacing.sm,
    },
    heroEmail: {
      opacity: 0.7,
    },
    roleBadge: {
      borderRadius: theme.borderRadius.pill,
      marginTop: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },

    // ---- Card sections ----
    section: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.lg,
      overflow: 'hidden',
      ...theme.shadows.sm,
    },
    sectionLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: '600' as const,
      letterSpacing: 0.8,
      paddingBottom: theme.spacing.xs,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      textTransform: 'uppercase' as const,
    },

    // ---- Info rows ----
    row: {
      alignItems: 'center',
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: theme.spacing.md,
      minHeight: 56,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowIcon: {
      alignItems: 'center',
      justifyContent: 'center',
      width: theme.spacing['2xl'],
    },
    rowContent: {
      flex: 1,
      gap: 2,
    },
    rowLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    rowValue: {
      color: theme.colors.text,
      fontSize: theme.typography.fontSize.md,
    },
    rowChevron: {
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ---- Editable input ----
    input: {
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      color: theme.colors.text,
      flex: 1,
      fontSize: theme.typography.fontSize.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    editButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      minWidth: 44,
    },

    // ---- Danger row (sign out) ----
    dangerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.md,
      minHeight: 56,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },

    // ---- Settings screen ----
    background: {backgroundColor: theme.colors.background, flex: 1},
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
