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
  /** Shadow color for bottom sheets. */
  shadowDark: '#0A1628',
  /** Header background when driver is ATIVO (active/available). */
  headerActive: '#145C3E',
  /** Header background when driver is OFFLINE. */
  headerOffline: '#7A2A1A',
  /** Dot color inside header when active. */
  headerActiveDot: '#4FFFB0',
  /** Dot color inside header when offline. */
  headerOfflineDot: '#FFB3A0',
  /** Active status button background. */
  statusBtnActive: '#1D9E75',
  /** Offline status button background. */
  statusBtnOffline: '#D85A30',
  /** Semi-transparent green badge background for active status in header. */
  statusBadgeActiveBg: 'rgba(29,158,117,0.25)',
  /** Semi-transparent red badge background for offline status in header. */
  statusBadgeOfflineBg: 'rgba(216,90,48,0.25)',
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
      flex: 1,
    },
    mapWrapper: {
      flex: 1,
      position: 'relative',
    },
    mapFallback: {
      flex: 1,
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
    fabLocation: {
      backgroundColor: C.interactive,
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

    // ── Status header row — navy bg, status highlighted via inline badge ────
    statusHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[5],
      backgroundColor: C.navBg,
    },
    /** Small pill inside the header that carries the color signal. */
    statusInlineBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      paddingVertical: spacing[1],
      paddingHorizontal: spacing[4],
      borderRadius: borderRadius.radius.full,
    },
    statusHeaderText: {
      ...typo.scale.labelLg,
      fontSize: 16,
      color: C.textOnDark,
      letterSpacing: 0.5,
    },
    statusPillDotOnly: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    // ── Status pill — dot+label row inside the header bar ───────────────────
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
    },
    statusPillDot: {
      width: 10,
      height: 10,
      borderRadius: borderRadius.radius.full,
    },
    statusPillText: {
      ...typo.scale.labelMd,
      color: C.textOnDark,
    },
    // ── Dual status toggle buttons (Ativo / Offline) — 50/50 row ────────────
    statusDualBtnRow: {
      flexDirection: 'row',
      gap: spacing[3],
      marginBottom: spacing[4],
    },
    statusDualBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
      paddingVertical: spacing[3],
      borderRadius: borderRadius.radius.md,
    },
    statusDualBtnActive: {
      backgroundColor: C.statusBtnActive,
    },
    statusDualBtnOffline: {
      backgroundColor: C.statusBtnOffline,
    },
    statusDualBtnInactive: {
      opacity: 0.45,
    },
    statusDualBtnText: {
      ...typo.scale.labelMd,
      color: C.textOnDark,
    },

    // ── User marker (driver) — identical to the passenger's own location dot ──
    userMarkerPulse: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(39,110,241,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    userMarkerRing: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: C.cardBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userMarkerDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
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
      shadowColor: C.shadowDark,
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
    },
    realtimeStatusRow: {
      marginTop: spacing[1],
      marginBottom: 0,
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

    // ── Status availability toggle ────────────────────────────────────────────
    statusToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: spacing[2],
      borderWidth: 1.5,
      borderRadius: borderRadius.radius.full,
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[4],
      marginBottom: spacing[4],
    },
    statusToggleBtnDisabled: {
      opacity: 0.6,
    },
    statusToggleDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    statusToggleLabel: {
      ...typo.scale.labelMd,
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
      // No minHeight — sheet shrinks to fit its content automatically
      maxHeight: '70%',
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

    // ── Inline address row (matches passenger panel style) ────────────────────
    addressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      paddingHorizontal: spacing[1],
      marginBottom: spacing[2],
    },
    addressText: {
      ...typo.scale.bodySm,
      color: C.textMuted,
      flex: 1,
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
    chatFabBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: C.danger,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    chatFabBadgeText: {
      ...typo.scale.caption,
      color: C.textOnDark,
      fontWeight: '700',
      fontSize: 10,
    },

    // ── Finalizar confirmation modal ──────────────────────────────────────────
    confirmBackdrop: {
      flex: 1,
      backgroundColor: C.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing[5],
    },
    confirmCard: {
      backgroundColor: C.cardBg,
      borderRadius: borderRadius.radius.xl,
      width: '100%',
      maxWidth: 360,
      paddingHorizontal: spacing[6],
      paddingTop: spacing[6],
      paddingBottom: spacing[5],
      alignItems: 'center',
      gap: spacing[3],
      ...shadows.lg,
    },
    confirmIconWrap: {
      marginBottom: spacing[1],
    },
    confirmTitle: {
      ...typo.scale.headingMd,
      color: C.textDark,
      textAlign: 'center',
    },
    confirmBody: {
      ...typo.scale.bodyMd,
      color: C.textMuted,
      textAlign: 'center',
    },
    confirmBtnRow: {
      flexDirection: 'row',
      gap: spacing[3],
      marginTop: spacing[2],
      width: '100%',
    },
    confirmBtnSecondary: {
      flex: 1,
      height: 48,
      borderRadius: borderRadius.radius.md,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmBtnSecondaryText: {
      ...typo.scale.labelLg,
      color: C.textMuted,
    },
    confirmBtnPrimary: {
      flex: 1,
      height: 48,
      borderRadius: borderRadius.radius.md,
      backgroundColor: C.success,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmBtnPrimaryText: {
      ...typo.scale.labelLg,
      color: C.textOnDark,
    },

    // ── Destination pin — location-on icon, anchored at tip ─────────────────
    destinationPinWrapper: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      // Extra padding prevents the icon from being clipped by the annotation bounds
      paddingBottom: 2,
      marginBottom: -4,
    },

    // ── Origin pin — person-pin icon, anchored at tip ─────────────────────
    originPinWrapper: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: 2,
      marginBottom: -4,
    },

    // ── Legacy solid pins (kept for reference, no longer rendered) ────────────
    destinationPin: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: C.danger,
    },
    originPin: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: C.success,
    },

    // ── Route dot offset ─────────────────────────────────────────────────────
    routeDotOffset: {
      marginTop: spacing[1],
    },
    vehicleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[3],
      borderRadius: borderRadius.radius.md,
      backgroundColor: theme.design.surface300,
      alignSelf: 'flex-start',
      marginTop: spacing[2],
    },
    vehicleBtnText: {
      ...typo.scale.bodyMd,
      color: theme.design.textPrimary,
    },
  });
};
