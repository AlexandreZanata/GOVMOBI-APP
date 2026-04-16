/**
 * @fileoverview Styles for the PassageiroScreen (ride-hailing map experience).
 *
 * Layout layers (bottom to top):
 *   1. Full-screen Mapbox map
 *   2. Top search bar (floating)
 *   3. Right-side floating action buttons
 *   4. Search results overlay (conditional)
 *   5. Bottom sheet (always visible)
 *   6. Bottom tab bar (handled by navigator)
 */
import {StyleSheet} from 'react-native';
import type {Theme} from '../../theme';

/**
 * Creates the StyleSheet for PassageiroScreen.
 *
 * @param theme - The current GovMobile theme object.
 * @returns StyleSheet scoped to the Passageiro screen.
 */
export const createPassageiroStyles = (theme: Theme) => {
  const {design, spacing, borderRadius, shadows, typography: typo} = theme;

  return StyleSheet.create({
    // ── Root ──────────────────────────────────────────────────────────────────
    container: {
      flex: 1,
      backgroundColor: design.navy800,
    },
    map: {
      flex: 1,
    },

    // ── Top search bar ────────────────────────────────────────────────────────
    searchBarWrapper: {
      left: spacing[4],
      position: 'absolute',
      right: spacing[4],
      top: spacing[3],
      zIndex: 10,
    },
    searchBarContainer: {
      alignItems: 'center',
      backgroundColor: design.surface100,
      borderRadius: borderRadius.radius.full,
      flexDirection: 'row',
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      ...shadows.md,
    },
    searchBarInput: {
      ...typo.scale.bodyLg,
      color: design.textPrimary,
      flex: 1,
      marginHorizontal: spacing[2],
    },
    searchBarClearBtn: {
      alignItems: 'center',
      height: 24,
      justifyContent: 'center',
      width: 24,
    },

    // ── Right floating action buttons ─────────────────────────────────────────
    fabColumn: {
      gap: spacing[2],
      position: 'absolute',
      right: spacing[4],
      top: 80,
      zIndex: 10,
    },
    fab: {
      alignItems: 'center',
      backgroundColor: design.navy800,
      borderRadius: borderRadius.radius.full,
      height: 48,
      justifyContent: 'center',
      width: 48,
      ...shadows.md,
    },
    fabGreen: {
      alignItems: 'center',
      backgroundColor: design.success,
      borderRadius: borderRadius.radius.full,
      height: 48,
      justifyContent: 'center',
      width: 48,
      ...shadows.md,
    },

    // ── Search results overlay ────────────────────────────────────────────────
    searchOverlay: {
      backgroundColor: design.surface100,
      borderRadius: borderRadius.radius.lg,
      left: spacing[4],
      maxHeight: 340,
      position: 'absolute',
      right: spacing[4],
      top: 72,
      zIndex: 20,
      ...shadows.lg,
    },
    searchOverlayHeader: {
      alignItems: 'center',
      borderBottomColor: design.surface300,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },
    searchOverlayTitle: {
      ...typo.scale.headingSm,
      color: design.textPrimary,
    },
    searchResultItem: {
      borderBottomColor: design.surface300,
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },
    searchResultName: {
      ...typo.scale.headingSm,
      color: design.textPrimary,
      marginBottom: spacing[1],
    },
    searchResultAddress: {
      ...typo.scale.bodySm,
      color: design.textSecondary,
    },
    searchEmptyText: {
      ...typo.scale.bodyMd,
      color: design.textTertiary,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[4],
      textAlign: 'center',
    },

    // ── Bottom sheet ──────────────────────────────────────────────────────────
    bottomSheet: {
      backgroundColor: design.navy800,
      borderTopLeftRadius: borderRadius.radius.xl,
      borderTopRightRadius: borderRadius.radius.xl,
      paddingBottom: spacing[4],
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
    },
    bottomSheetHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing[3],
    },
    bottomSheetHeaderLeft: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing[2],
    },
    bottomSheetTitle: {
      ...typo.scale.headingMd,
      color: design.textOnDark,
    },
    bottomSheetDivider: {
      backgroundColor: design.navy600,
      height: StyleSheet.hairlineWidth,
      marginBottom: spacing[3],
    },
    destinoRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing[3],
      marginBottom: spacing[4],
    },
    destinoLabel: {
      ...typo.scale.labelSm,
      color: design.textOnDarkMuted,
      letterSpacing: 1,
      marginBottom: spacing[1],
      textTransform: 'uppercase',
    },
    destinoValue: {
      ...typo.scale.bodyMd,
      color: design.textOnDark,
    },
    ctaButton: {
      alignItems: 'center',
      backgroundColor: design.amber400,
      borderRadius: borderRadius.radius.lg,
      justifyContent: 'center',
      paddingVertical: spacing[4],
    },
    ctaButtonDisabled: {
      opacity: 0.6,
    },
    ctaButtonText: {
      ...typo.scale.headingMd,
      color: design.textOnDark,
    },

    // ── User location marker ──────────────────────────────────────────────────
    userMarker: {
      alignItems: 'center',
      backgroundColor: design.navy800,
      borderColor: design.surface100,
      borderRadius: borderRadius.radius.full,
      borderWidth: 2,
      height: 20,
      justifyContent: 'center',
      width: 20,
    },
    userMarkerDot: {
      backgroundColor: design.info,
      borderRadius: borderRadius.radius.full,
      height: 8,
      width: 8,
    },

    // ── Misc ──────────────────────────────────────────────────────────────────
    searchResultItemLast: {
      borderBottomWidth: 0,
    },
    mapFallback: {
      alignItems: 'center' as const,
      backgroundColor: design.surface200,
      flex: 1,
      justifyContent: 'center' as const,
    },
    destinoIcon: {
      marginTop: spacing[1],
    },
  });
};
