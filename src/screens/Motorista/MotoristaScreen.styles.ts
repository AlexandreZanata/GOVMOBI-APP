/**
 * @fileoverview Styles for the MotoristaScreen (driver home + active ride panel).
 *
 * All values use GovMobile design tokens — zero hardcoded colors or pixel values.
 */
import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

/** Semantic color constants derived from the design system. */
export const MotoristaColors = {
  /** Navy background — matches PassageiroNavigator tab bar. */
  navBg: '#0D1B2A',
  /** Interactive blue — matches PassageiroColors.interactive. */
  interactive: '#2F80FF',
  /** Interactive blue with low opacity for marker ring. */
  interactiveRing: 'rgba(47,128,255,0.15)',
  /** Text on dark surfaces. */
  textOnDark: '#FFFFFF',
  /** Muted text on dark surfaces. */
  textOnDarkMuted: 'rgba(255,255,255,0.45)',
  /** Card background. */
  cardBg: '#FFFFFF',
  /** Overlay for loading states. */
  overlay: 'rgba(11,22,35,0.55)',
  /** Success green. */
  success: '#1D9E75',
  /** Danger red. */
  danger: '#D85A30',
  /** Warning amber. */
  warning: '#E0AD3D',
  /** Muted text. */
  textMuted: '#8A94A6',
  /** Dark text. */
  textDark: '#0B1623',
} as const;

/**
 * Creates the StyleSheet for the MotoristaScreen.
 *
 * @param theme - GovMobile theme object.
 * @returns StyleSheet for the driver home screen.
 */
export const createMotoristaStyles = (theme: Theme) => {
  const {spacing, borderRadius, shadows, typography: typo} = theme;
  const C = MotoristaColors;

  return StyleSheet.create({
    // ── Root ─────────────────────────────────────────────────────────────────
    container: {
      flex: 1,
      backgroundColor: C.navBg,
    },

    // ── Map ──────────────────────────────────────────────────────────────────
    map: {
      ...StyleSheet.absoluteFillObject,
    },
    mapFallback: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.navBg,
    },
    mapFallbackText: {
      ...typo.scale.bodyMd,
      color: C.textOnDarkMuted,
      marginTop: spacing[3],
    },

    // ── FAB column ────────────────────────────────────────────────────────────
    fabColumn: {
      position: 'absolute',
      right: spacing[4],
      gap: spacing[3],
      zIndex: 10,
    },
    fab: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.radius.full,
      backgroundColor: C.navBg,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.md,
    },
    fabBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 8,
      height: 8,
      borderRadius: borderRadius.radius.full,
      backgroundColor: C.danger,
    },

    // ── Status pill (top center) ──────────────────────────────────────────────
    statusPillWrapper: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 10,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.navBg,
      borderRadius: borderRadius.radius.full,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
      gap: spacing[2],
      ...shadows.md,
    },
    statusPillDot: {
      width: 8,
      height: 8,
      borderRadius: borderRadius.radius.full,
    },
    statusPillText: {
      ...typo.scale.labelMd,
      color: C.textOnDark,
    },

    // ── User marker ───────────────────────────────────────────────────────────
    userMarkerPulse: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userMarkerRing: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: C.interactive,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.interactiveRing,
    },
    userMarkerDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: C.interactive,
    },

    // ── Bottom sheet (idle — no active ride) ──────────────────────────────────
    idleSheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: C.cardBg,
      borderTopLeftRadius: borderRadius.radius.xl,
      borderTopRightRadius: borderRadius.radius.xl,
      paddingHorizontal: spacing[5],
      paddingTop: spacing[5],
      zIndex: 20,
      // Shadow only upward — avoids the top-edge line on Android elevation
      shadowColor: '#0A1628',
      shadowOffset: {width: 0, height: -4},
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 8,
    },
    dragHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border,
      alignSelf: 'center',
      marginBottom: spacing[4],
    },
    idleTitle: {
      ...typo.scale.headingMd,
      color: C.textDark,
      marginBottom: spacing[1],
    },
    idleSubtitle: {
      ...typo.scale.bodyMd,
      color: C.textMuted,
      marginBottom: spacing[4],
    },
    statusIndicatorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      marginBottom: spacing[4],
    },
    realtimeStatusRow: {
      marginTop: spacing[1],
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    statusLabel: {
      ...typo.scale.labelMd,
      color: C.textDark,
    },

    // ── Active ride sheet ─────────────────────────────────────────────────────
    activeSheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: C.cardBg,
      borderTopLeftRadius: borderRadius.radius.xl,
      borderTopRightRadius: borderRadius.radius.xl,
      paddingHorizontal: spacing[5],
      paddingTop: spacing[3],
      zIndex: 20,
      ...shadows.lg,
    },
    activeSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing[3],
    },
    activeSheetTitle: {
      ...typo.scale.headingMd,
      color: C.textDark,
    },
    statusBadge: {
      borderRadius: borderRadius.radius.full,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
    },
    statusBadgeText: {
      ...typo.scale.labelSm,
      color: C.textOnDark,
    },

    // ── Route row ─────────────────────────────────────────────────────────────
    routeRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[3],
      marginBottom: spacing[3],
    },
    routeTextBlock: {
      flex: 1,
    },
    routeLabel: {
      ...typo.scale.labelSm,
      color: C.textMuted,
      marginBottom: 2,
    },
    routeValue: {
      ...typo.scale.bodyMd,
      color: C.textDark,
    },

    // ── Action buttons ────────────────────────────────────────────────────────
    actionButton: {
      borderRadius: borderRadius.radius.md,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[4],
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing[3],
    },
    actionButtonText: {
      ...typo.scale.labelLg,
      color: C.textOnDark,
    },
    actionButtonPrimary: {
      backgroundColor: C.interactive,
    },
    actionButtonSuccess: {
      backgroundColor: C.success,
    },
    actionButtonDanger: {
      backgroundColor: C.danger,
    },
    actionButtonDisabled: {
      opacity: 0.5,
    },

    // ── Cancel input ──────────────────────────────────────────────────────────
    cancelInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: borderRadius.radius.sm,
      padding: spacing[3],
      color: C.textDark,
      marginBottom: spacing[3],
      ...typo.scale.bodyMd,
    },

    // ── Terminal state ────────────────────────────────────────────────────────
    terminalContainer: {
      alignItems: 'center',
      paddingVertical: spacing[6],
      gap: spacing[3],
    },
    terminalText: {
      ...typo.scale.headingMd,
      color: C.textDark,
      textAlign: 'center',
    },

    // ── Loading overlay ───────────────────────────────────────────────────────
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: C.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    },

    // ── Chat FAB ──────────────────────────────────────────────────────────────
    chatFab: {
      position: 'absolute',
      right: spacing[4],
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: C.interactive,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 25,
      ...shadows.lg,
    },

    // ── Destination pin ───────────────────────────────────────────────────────
    destinationPin: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: C.danger,
    },
  });
};
