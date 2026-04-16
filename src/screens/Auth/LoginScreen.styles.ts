/**
 * @fileoverview Styles for the LoginScreen.
 *
 * Safe-area strategy:
 * - The root `SafeAreaView` (edges: top, bottom) handles notch/home-indicator
 *   on both iOS and Android — no manual inset arithmetic needed.
 * - `KeyboardAvoidingView` sits inside SafeAreaView so the keyboard offset is
 *   calculated relative to the already-inset area, preventing the white gap
 *   that appears on Android when behavior="height" is used outside SafeAreaView.
 *
 * All values sourced from theme tokens — no hardcoded colors or sizes.
 */
import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

/**
 * Creates the StyleSheet for LoginScreen.
 *
 * @param theme - The current GovMobile theme object.
 * @returns A StyleSheet object scoped to the Login screen.
 */
// eslint-disable-next-line react-native/no-unused-styles
export const createLoginStyles = (theme: Theme) =>
  StyleSheet.create({
    /** Fills the safe area; primary brand colour shows behind the scroll. */
    safeArea: {
      backgroundColor: theme.colors.primary,
      flex: 1,
    },
    /** Expands to fill the safe area so keyboard avoidance works correctly. */
    keyboardView: {
      flex: 1,
    },
    /**
     * ScrollView content container.
     * `flexGrow: 1` + `justifyContent: 'center'` keeps the card centred on
     * tall screens while still scrolling on short ones (e.g. SE / small Android).
     */
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing['3xl'],
    },
    /** Brand header above the card. */
    header: {
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing['2xl'],
    },
    appName: {
      fontSize: theme.typography.fontSize['3xl'],
    },
    subtitle: {
      opacity: 0.75,
    },
    /** White card that contains the form. */
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      gap: theme.spacing.md,
      padding: theme.spacing.xl,
      ...theme.shadows.md,
    },
    cardTitle: {
      marginBottom: theme.spacing.xs,
      textAlign: 'center',
    },
    hint: {
      textAlign: 'center',
    },
    button: {
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      marginTop: theme.spacing.xs,
      paddingVertical: theme.spacing.md,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });
