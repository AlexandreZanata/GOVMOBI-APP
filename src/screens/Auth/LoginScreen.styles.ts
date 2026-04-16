/**
 * @fileoverview Styles for the LoginScreen.
 * All values sourced from theme tokens — no hardcoded colors or sizes.
 */
import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

/**
 * Creates the StyleSheet for LoginScreen.
 *
 * @param theme - The current GovMobile theme object.
 * @param topInset - Safe-area top inset in pixels.
 * @returns A StyleSheet object scoped to the Login screen.
 */
// eslint-disable-next-line react-native/no-unused-styles
export const createLoginStyles = (theme: Theme, topInset: number) =>
  StyleSheet.create({
    root: {
      backgroundColor: theme.colors.primary,
      flex: 1,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: topInset + theme.spacing['3xl'],
      paddingBottom: theme.spacing['3xl'],
    },
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing['3xl'],
      gap: theme.spacing.sm,
    },
    appName: {
      fontSize: theme.typography.fontSize['3xl'],
    },
    subtitle: {
      opacity: 0.75,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      gap: theme.spacing.md,
      padding: theme.spacing.xl,
      ...theme.shadows.md,
    },
    cardTitle: {
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    hint: {
      textAlign: 'center',
    },
    button: {
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      marginTop: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });
