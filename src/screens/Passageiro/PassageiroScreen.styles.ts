/**
 * @fileoverview Styles for PassageiroScreen — white bottom sheet variant.
 *
 * Bottom sheet & search bar are now white (#FFFFFF) with dark text.
 * FABs remain dark. CTA stays amber. Map unchanged.
 * Search bar header band extends edge-to-edge covering the status bar area.
 */
import {StyleSheet} from 'react-native';

const C = {
  // surfaces
  surfaceDark: '#09090B',
  surfaceCard: '#FFFFFF',
  surfaceSubtle: '#F7F7F8', // input bg inside white sheet
  accent: '#F5C842',
  accentPress: '#D4A900',
  interactive: '#2F80FF',
  interactiveBg: '#EFF6FF',
  interactivePress: '#1F6FE5',
  // search bar header band — matches passenger action/tab bar background
  searchBand: '#0D1B2A',
  searchBandFocus: '#0D1B2A',
  searchBandIcon: 'rgba(255,255,255,0.20)',
  // text on white
  textDark: '#09090B',
  textMid: '#52525B',
  textMuted: '#A1A1AA',
  // text on dark (FABs + search band)
  textOnDark: '#FFFFFF',
  textOnDarkMuted: 'rgba(255,255,255,0.75)',
  // map / misc
  mapBg: '#F5F5F5',
  dividerLight: '#E4E4E7', // divider inside white sheet
  handleLight: '#D4D4D8', // drag handle on white
  resultDivider: '#F4F4F5',
  resultHover: '#FAFAFA',
  closeBg: '#F4F4F5',
  errorRed: '#EF4444',
  successGreen: '#1D9E75',
  stopMarker: '#D85A30',
  shadow: '#000000',
  markerShadowDot: 'rgba(0,0,0,0.22)',
  accentShadow: '#F5C842',
  pulseBg: 'rgba(39,110,241,0.15)',
  transparent: 'transparent',
  // search bar container states
  searchContainerDefault: 'rgba(255,255,255,0.15)',
  searchContainerDefaultBorder: 'rgba(255,255,255,0.25)',
  searchContainerFocused: 'rgba(255,255,255,0.22)',
  searchContainerFocusedBorder: 'rgba(255,255,255,0.50)',
  searchContainerFilled: 'rgba(255,255,255,0.18)',
  searchContainerFilledBorder: 'rgba(255,255,255,0.35)',
  searchClearBtn: 'rgba(255,255,255,0.12)',
  // modal backdrop
  backdropOverlay: 'rgba(9,9,11,0.55)',
  // error input background
  errorInputBg: '#FFF5F5',
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

    // ── Map overlay pins (destination + driver car) ──────────────────────────
    destinationPinWrapper: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginBottom: -4,
      shadowColor: C.shadow,
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.24,
      shadowRadius: 4,
      elevation: 4,
    },
    destinationPinShadowDot: {
      width: 10,
      height: 4,
      borderRadius: 5,
      backgroundColor: C.markerShadowDot,
      marginTop: -2,
    },
    destinationPinIcon: {
      textShadowColor: C.shadow,
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 2,
    },
    stopPin: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: C.stopMarker,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: C.surfaceCard,
      shadowColor: C.shadow,
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    stopPinText: {
      fontSize: 13,
      fontWeight: '800',
      color: C.surfaceCard,
    },
    driverCarPin: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: C.interactive,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: C.shadow,
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 4,
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

    // ── Layer 2: Top search bar — full-width vibrant blue band ──────────────
    // The band starts at y=0 (behind the status bar) and extends edge-to-edge.
    // `searchBarWrapper` is positioned absolutely with left:0/right:0 so it
    // bleeds under the status bar, giving the "status bar tinted" effect.
    searchBarWrapper: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      backgroundColor: C.searchBand,
      // bottom padding is baked in; top padding is set dynamically via
      // paddingTop = insets.top + 10 in the component
      paddingHorizontal: 16,
      paddingBottom: 14,
      shadowColor: C.searchBand,
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.28,
      shadowRadius: 14,
      elevation: 10,
    },
    searchBarContainer: {
      height: 54,
      backgroundColor: C.searchContainerDefault,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.searchContainerDefaultBorder,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
    },
    searchBarContainerFocused: {
      backgroundColor: C.searchContainerFocused,
      borderColor: C.searchContainerFocusedBorder,
    },
    searchBarContainerFilled: {
      backgroundColor: C.searchContainerFilled,
      borderColor: C.searchContainerFilledBorder,
    },
    searchBarLeftIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: C.searchBandIcon,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    searchBarInput: {
      flex: 1,
      fontSize: 15,
      color: C.textOnDark,
      marginHorizontal: 10,
      paddingVertical: 0,
    },
    searchBarClearBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: C.searchClearBtn,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchBarRightIcon: {
      width: 32,
      height: 32,
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
      paddingBottom: 0,
      zIndex: 20,
      shadowColor: C.shadow,
      shadowOffset: {width: 0, height: -4},
      shadowOpacity: 0.1,
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
      minWidth: 0,
    },
    destinoClearBtn: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.errorRed,
      marginTop: 2,
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
      flexShrink: 1,
    },
    destinoPlaceholder: {
      fontSize: 15,
      fontWeight: '400',
      color: C.textMuted,
      flexShrink: 1,
    },

    // Route preview status inside bottom sheet
    routeStatusWrap: {
      marginBottom: 14,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: C.surfaceSubtle,
      borderWidth: 1,
      borderColor: C.dividerLight,
    },
    routeLoadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    routeStatusText: {
      fontSize: 13,
      fontWeight: '500',
      color: C.textMid,
    },
    routeSummaryText: {
      fontSize: 13,
      fontWeight: '600',
      color: C.textDark,
    },
    routeErrorText: {
      fontSize: 13,
      fontWeight: '500',
      color: C.errorRed,
    },
    /** Wraps add-stop control and stop list so widths stay aligned. */
    stopsColumn: {
      width: '100%',
      alignSelf: 'center',
    },
    /** Full-width bar matching stop rows; centered +; shorter than primary CTA. */
    addStopRow: {
      width: '100%',
      marginTop: -8,
      marginBottom: 10,
    },
    /** Outlined control aligned to stop address cards. */
    addStopIconButton: {
      width: '100%',
      height: 40,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: C.interactive,
      backgroundColor: C.surfaceCard,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addStopIconButtonPressed: {
      backgroundColor: C.surfaceSubtle,
      transform: [{scale: 0.99}],
    },
    stopRow: {
      width: '100%',
      minHeight: 40,
      borderRadius: 12,
      backgroundColor: C.surfaceCard,
      borderWidth: 1.5,
      borderColor: C.interactive,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 8,
      shadowColor: C.shadow,
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    stopListScroll: {
      maxHeight: 176,
      marginTop: 6,
      marginBottom: 8,
    },
    stopRowText: {
      fontSize: 13,
      fontWeight: '500',
      color: C.textDark,
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
      marginRight: 8,
    },
    /** Matches destination clear control — visible X-style remove for each stop row. */
    stopRowRemove: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.errorRed,
    },

    // CTA button
    ctaButton: {
      width: '100%',
      height: 60,
      backgroundColor: C.interactive,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: C.interactive,
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 6,
    },
    /** Applied only to the last CTA in the idle sheet — tight bottom margin. */
    ctaButtonLast: {
      marginBottom: 11,
    },
    ctaButtonPressed: {
      backgroundColor: C.interactivePress,
      transform: [{scale: 0.98}],
    },
    ctaButtonDisabled: {
      opacity: 0.4,
    },
    ctaButtonText: {
      fontSize: 17,
      fontWeight: '700',
      color: C.surfaceCard,
      letterSpacing: 0.3,
    },

    // ── Driver strip inside active ride panel ────────────────────────────────
    driverStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 10,
      gap: 10,
    },
    driverStripAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: C.interactiveBg,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      overflow: 'hidden',
    },
    driverStripAvatarImage: {
      width: '100%',
      height: '100%',
    },
    driverStripInfo: {
      flex: 1,
      gap: 2,
    },
    driverStripName: {
      fontSize: 14,
      fontWeight: '700',
      color: C.textDark,
    },
    driverStripVehicle: {
      fontSize: 12,
      fontWeight: '500',
      color: C.textMid,
      letterSpacing: 0.5,
    },
    driverStripDivider: {
      height: 1,
      backgroundColor: C.dividerLight,
      marginHorizontal: 16,
      marginBottom: 8,
    },
    // ── Active ride banner (replaces bottom sheet when ride is in progress) ──
    activeBanner: {
      borderTopWidth: 3,
      borderTopColor: C.interactive,
    },
    activeBannerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 8,
      gap: 8,
    },
    activeBannerDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    activeBannerText: {
      flex: 1,
    },
    activeBannerTitle: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: C.textDark,
    },
    activeBannerSubtitle: {
      fontSize: 12,
      color: C.textMuted,
      marginTop: 2,
    },
    activeBannerAddressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 6,
      gap: 6,
    },
    activeBannerAddressIcon: {
      flexShrink: 0,
    },
    activeBannerAddress: {
      flex: 1,
      fontSize: 12,
      color: C.textMid,
    },
    // ── Chat FAB ─────────────────────────────────────────────────────────────
    chatFab: {
      position: 'absolute',
      right: 16,
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: C.interactive,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: C.shadow,
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 6,
      zIndex: 20,
    },
    chatFabBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: C.errorRed,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    chatFabBadgeText: {
      color: C.textOnDark,
      fontWeight: '700',
      fontSize: 10,
    },
    // ── Cancel section inside active ride panel ───────────────────────────────
    cancelSection: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: C.dividerLight,
    },
    cancelInput: {
      backgroundColor: C.surfaceSubtle,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.dividerLight,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: C.textDark,
      marginBottom: 10,
    },
    cancelBtnRow: {
      flexDirection: 'row',
      gap: 8,
    },
    cancelBtnSecondary: {
      flex: 1,
      height: 42,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.dividerLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnSecondaryText: {
      fontSize: 14,
      fontWeight: '600',
      color: C.textMid,
    },
    cancelBtnDanger: {
      flex: 2,
      height: 42,
      borderRadius: 10,
      backgroundColor: C.errorRed,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnDisabled: {
      opacity: 0.5,
    },
    cancelBtnDangerText: {
      fontSize: 14,
      fontWeight: '700',
      color: C.surfaceCard,
    },
    cancelOpenBtn: {
      marginTop: 10,
      height: 42,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.errorRed,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelOpenBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: C.errorRed,
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
    // ── Quick shortcuts (Home / Work) ────────────────────────────────────────
    shortcutsRow: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    shortcutChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: C.surfaceSubtle,
      borderWidth: 1,
      borderColor: C.dividerLight,
    },
    shortcutChipText: {
      fontSize: 13,
      fontWeight: '500',
      color: C.textMid,
    },
  });
