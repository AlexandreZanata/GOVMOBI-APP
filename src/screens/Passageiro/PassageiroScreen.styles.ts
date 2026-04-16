/**
 * @fileoverview Styles for PassageiroScreen — white bottom sheet variant.
 *
 * Bottom sheet & search bar are now white (#FFFFFF) with dark text.
 * FABs remain dark. CTA stays amber. Map unchanged.
 */
import {StyleSheet} from 'react-native';

const C = {
  // surfaces
  surfaceDark:    '#09090B',
  surfaceCard:    '#FFFFFF',
  surfaceSubtle:  '#F7F7F8',   // input bg inside white sheet
  accent:         '#F5C842',
  accentPress:    '#D4A900',
  interactive:    '#276EF1',
  interactiveBg:    '#EFF6FF',
  interactivePress: '#1A5DC8',
  // text on white
  textDark:       '#09090B',
  textMid:        '#52525B',
  textMuted:      '#A1A1AA',
  // text on dark (FABs only)
  textOnDark:     '#FFFFFF',
  // map / misc
  mapBg:          '#F5F5F5',
  dividerLight:   '#E4E4E7',   // divider inside white sheet
  handleLight:    '#D4D4D8',   // drag handle on white
  resultDivider:  '#F4F4F5',
  resultHover:    '#FAFAFA',
  closeBg:        '#F4F4F5',
  errorRed:       '#EF4444',
  shadow:         '#000000',
  accentShadow:   '#F5C842',
  pulseBg:        'rgba(39,110,241,0.15)',
  transparent:    'transparent',
} as const;

export const PassageiroColors = C;

export const createPassageiroStyles = () =>
  StyleSheet.create({
    // ── Root ────────────────────────────────────────────────────────────────
    container: {
      flex: 1,
      backgroundColor: C.mapBg,
    },

    // ── Layer 1: Map ─────────────────────────────────────────────────────────
    map: {
      ...StyleSheet.absoluteFillObject,
    },
    mapFallback: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      backgroundColor: C.mapBg,
      justifyContent: 'center',
    },
    mapFallbackText: {
      fontSize: 14,
      color: C.textMuted,
      marginTop: 12,
    },

    // ── User location marker ─────────────────────────────────────────────────
    userMarkerPulse: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: C.pulseBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userMarkerRing: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: C.surfaceCard,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userMarkerDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: C.interactive,
    },

    // ── Destination pin ──────────────────────────────────────────────────────
    destPinOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: C.accent,
      borderWidth: 1.5,
      borderColor: C.surfaceDark,
      alignItems: 'center',
      justifyContent: 'center',
    },
    destPinInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: C.surfaceDark,
    },
    destPinTail: {
      width: 0,
      height: 0,
      borderLeftWidth: 5,
      borderRightWidth: 5,
      borderTopWidth: 8,
      borderLeftColor: C.transparent,
      borderRightColor: C.transparent,
      borderTopColor: C.accent,
      marginTop: -1,
    },
    destPinWrapper: {
      alignItems: 'center',
    },

    // ── Layer 2: Top search bar ──────────────────────────────────────────────
    searchBarWrapper: {
      position: 'absolute',
      left: 16,
      right: 16,
      zIndex: 10,
    },
    searchBarContainer: {
      height: 52,
      backgroundColor: C.surfaceCard,
      borderRadius: 26,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      shadowColor: C.shadow,
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.10,
      shadowRadius: 20,
      elevation: 6,
    },
    searchBarContainerFocused: {
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 8,
    },
    searchBarInput: {
      flex: 1,
      fontSize: 15,
      color: C.textDark,
      marginHorizontal: 10,
      paddingVertical: 0,
    },
    searchBarClearBtn: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Layer 3: Right FAB column ────────────────────────────────────────────
    fabColumn: {
      position: 'absolute',
      right: 16,
      zIndex: 10,
      gap: 10,
    },
    fab: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: C.surfaceDark,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: C.shadow,
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 5,
    },
    fabLocation: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: C.interactive,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: C.shadow,
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 5,
    },
    fabBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: C.errorRed,
    },

    // ── Layer 4: Bottom sheet — WHITE ────────────────────────────────────────
    bottomSheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: C.surfaceCard,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: 4,
      zIndex: 20,
      shadowColor: C.shadow,
      shadowOffset: {width: 0, height: -4},
      shadowOpacity: 0.10,
      shadowRadius: 20,
      elevation: 12,
    },
    dragHandle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.handleLight,
      marginTop: 10,
      marginBottom: 16,
    },

    // Header row
    bottomSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    bottomSheetHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    bottomSheetTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: C.textDark,
      letterSpacing: -0.2,
    },
    bottomSheetSubtitle: {
      fontSize: 13,
      fontWeight: '400',
      color: C.textMuted,
      marginTop: 1,
    },

    // "Where to?" search row inside the sheet
    sheetSearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.surfaceSubtle,
      borderRadius: 14,
      paddingHorizontal: 14,
      height: 50,
      marginBottom: 16,
      gap: 10,
    },
    sheetSearchText: {
      flex: 1,
      fontSize: 15,
      color: C.textMuted,
    },
    sheetSearchTextActive: {
      color: C.textDark,
      fontWeight: '500',
    },

    // Divider
    bottomSheetDivider: {
      height: 1,
      backgroundColor: C.dividerLight,
      marginBottom: 16,
    },

    // Destination row
    destinoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 20,
    },
    destinoIconWrapper: {
      marginTop: 2,
    },
    destinoTextBlock: {
      flex: 1,
    },
    destinoLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: C.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 3,
    },
    destinoValue: {
      fontSize: 15,
      fontWeight: '500',
      color: C.textDark,
    },
    destinoPlaceholder: {
      fontSize: 15,
      fontWeight: '400',
      color: C.textMuted,
    },

    // CTA button
    ctaButton: {
      width: '100%',
      height: 54,
      backgroundColor: C.interactive,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: C.interactive,
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.30,
      shadowRadius: 16,
      elevation: 6,
    },
    ctaButtonPressed: {
      backgroundColor: C.interactivePress,
      transform: [{scale: 0.98}],
    },
    ctaButtonDisabled: {
      opacity: 0.4,
    },
    ctaButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: C.surfaceCard,
      letterSpacing: 0.3,
    },

    // ── Layer 5: Search results overlay ─────────────────────────────────────
    searchOverlay: {
      position: 'absolute',
      left: 16,
      right: 16,
      backgroundColor: C.surfaceCard,
      borderRadius: 20,
      maxHeight: 340,
      zIndex: 30,
      overflow: 'hidden',
      shadowColor: C.shadow,
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.12,
      shadowRadius: 32,
      elevation: 10,
    },
    searchOverlayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    searchOverlayTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: C.textDark,
    },
    searchOverlayClose: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: C.closeBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchResultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 64,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: C.resultDivider,
      gap: 12,
    },
    searchResultIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: C.interactiveBg,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    searchResultTextBlock: {
      flex: 1,
    },
    searchResultName: {
      fontSize: 15,
      fontWeight: '600',
      color: C.textDark,
      marginBottom: 2,
    },
    searchResultAddress: {
      fontSize: 13,
      fontWeight: '400',
      color: C.textMid,
    },
    searchEmptyText: {
      fontSize: 14,
      color: C.textMuted,
      textAlign: 'center',
      paddingVertical: 24,
      paddingHorizontal: 16,
    },
    searchLoadingPad: {
      paddingVertical: 20,
    },
  });
