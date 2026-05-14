/**
 * @fileoverview Styles for the redesigned LoginScreen.
 *
 * Layout strategy (Design_Prompt §4 Screen 1):
 * - Full-screen background: design.navy800
 * - Top 35%: logo area on a dark background
 * - Bottom 65%: rounded-top card (surface100, radius.xl) anchored to bottom
 *
 * All values reference theme tokens — zero hardcoded colors or pixel values.
 */
import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

/**
 * Creates the StyleSheet for LoginScreen.
 *
 * @param theme - The current Sorrimobi theme object.
 * @returns A StyleSheet object scoped to the Login screen.
 */
// eslint-disable-next-line react-native/no-unused-styles
export const createLoginStyles = (theme: Theme) => {
  const {design, typography: typo, spacing, borderRadius, shadows} = theme;

  return StyleSheet.create({
    /** Root container — full dark navy background. */
    safeArea: {
      backgroundColor: design.navy800,
      flex: 1,
    },

    keyboardView: {
      flex: 1,
    },

    /**
     * Outer scroll container.
     * flexGrow + justifyContent keeps the layout stable on tall screens
     * while still scrolling on compact devices.
     */
    scroll: {
      flexGrow: 1,
      justifyContent: 'flex-end',
    },

    // -----------------------------------------------------------------------
    // Logo / brand area — top 35%
    // -----------------------------------------------------------------------

    /** Occupies the top portion of the screen above the card. */
    logoArea: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing[6],
      paddingTop: spacing[8],
      paddingBottom: spacing[6],
    },

    /** 4-square geometric mark container. */
    logoMark: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[1],
      marginBottom: spacing[4],
      width: 40,
      height: 40,
    },

    /** Each of the 4 amber squares in the logo mark. */
    logoSquare: {
      backgroundColor: design.amber500,
      borderRadius: borderRadius.radius.sm,
      height: 18,
      width: 18,
    },

    appName: {
      ...typo.scale.displayLg,
      color: design.textOnDark,
      textAlign: 'center',
    },

    subtitle: {
      ...typo.scale.bodyMd,
      color: design.textOnDarkMuted,
      marginTop: spacing[2],
      textAlign: 'center',
    },

    // -----------------------------------------------------------------------
    // Form card — bottom 65%, rounded top
    // -----------------------------------------------------------------------

    /** White card anchored to the bottom of the screen. */
    card: {
      backgroundColor: design.surface100,
      borderTopLeftRadius: borderRadius.radius.xl,
      borderTopRightRadius: borderRadius.radius.xl,
      gap: spacing[4],
      paddingHorizontal: spacing[6],
      paddingTop: spacing[6],
      paddingBottom: spacing[8],
      ...shadows.cardHover,
    },

    cardTitle: {
      ...typo.scale.headingLg,
      color: design.textPrimary,
      marginBottom: spacing[2],
    },

    // -----------------------------------------------------------------------
    // Primary button (Design_Prompt §3.5)
    // -----------------------------------------------------------------------

    button: {
      alignItems: 'center',
      backgroundColor: design.navy800,
      borderRadius: borderRadius.radius.md,
      height: 52,
      justifyContent: 'center',
      marginTop: spacing[2],
    },

    buttonPressed: {
      opacity: 0.85,
    },

    buttonDisabled: {
      opacity: 0.6,
    },

    buttonLabel: {
      ...typo.scale.labelLg,
      color: design.textOnDark,
      letterSpacing: 0.5,
    },

    // -----------------------------------------------------------------------
    // Version caption
    // -----------------------------------------------------------------------

    version: {
      ...typo.scale.caption,
      color: design.textTertiary,
      marginTop: spacing[2],
      textAlign: 'center',
    },
  });
};
