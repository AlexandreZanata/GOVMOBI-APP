/**
 * @fileoverview PassageiroIdleSheet — bottom sheet shown when no active ride exists.
 * Contains destination selector, route preview, and the CTA button.
 *
 * Behaviour:
 * - The chevron (expand-more / expand-less) toggles a collapsed state that
 *   hides the destination row and route preview, showing only the title + CTA.
 * - The CTA is always enabled. When no destination is selected it calls
 *   `onOpenSearch` to focus the address search bar instead of opening the
 *   request modal.
 */
import React, {useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  Text,
  View,
} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {
  createPassageiroStyles,
  PassageiroColors as C,
} from '../PassageiroScreen.styles';

export interface PassageiroIdleSheetProps {
  /** Animated translateY for the slide-up entrance. */
  sheetTranslate: Animated.Value;
  /** Bottom padding to respect safe area. */
  paddingBottom: number;
  /** Called when the sheet layout is measured. */
  onLayout: () => void;
  /** Selected destination label, or null if none. */
  selectedDestinoLabel: string | null;
  /** Whether a route preview is loading. */
  isRouting: boolean;
  /** Whether the current role can preview routes. */
  canPreviewRoute: boolean;
  /** Localized route summary string (distance + duration). */
  routeSummary: string | null;
  /** Localized route feedback/error message. */
  routeFeedback: string | null;
  /**
   * @deprecated No longer used — CTA is always enabled.
   * Kept for API compatibility; will be removed in a future cleanup.
   */
  ctaDisabled: boolean;
  onOpenRequestModal: () => void;
  /** Opens the address search bar (called when CTA is pressed without a destination). */
  onOpenSearch: () => void;
}

/**
 * Idle bottom sheet for the passenger home screen.
 *
 * @param props - {@link PassageiroIdleSheetProps}
 * @returns JSX element for the idle sheet.
 */
export const PassageiroIdleSheet = ({
  sheetTranslate,
  paddingBottom,
  onLayout,
  selectedDestinoLabel,
  isRouting,
  canPreviewRoute,
  routeSummary,
  routeFeedback,
  onOpenRequestModal,
  onOpenSearch,
}: PassageiroIdleSheetProps): React.JSX.Element => {
  const {t} = useTranslation();
  const styles = createPassageiroStyles();
  const hasDestination = !!selectedDestinoLabel;

  /** When true the sheet is collapsed — only title + CTA are visible. */
  const [collapsed, setCollapsed] = useState(false);

  const handleCta = () => {
    if (!hasDestination) {
      onOpenSearch();
    } else {
      onOpenRequestModal();
    }
  };

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        styles.bottomSheet,
        {transform: [{translateY: sheetTranslate}]},
      ]}
      testID="bottom-sheet">
      <View style={styles.dragHandle} />
      <View style={styles.bottomSheetHeader}>
        <View>
          <Text style={styles.bottomSheetTitle}>
            {t('passageiro.bottomSheet.title')}
          </Text>
          {!collapsed && (
            <Text style={styles.bottomSheetSubtitle}>
              {t('passageiro.searchBar.placeholder')}
            </Text>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={collapsed
            ? t('passageiro.bottomSheet.expand')
            : t('passageiro.bottomSheet.collapse')}
          hitSlop={12}
          onPress={() => setCollapsed(prev => !prev)}
          testID="sheet-collapse-toggle">
          <MaterialIcons
            name={collapsed ? 'expand-less' : 'expand-more'}
            size={20}
            color={C.textMuted}
          />
        </Pressable>
      </View>

      {/* Collapsible content */}
      {!collapsed && (
        <>
          {/* Destination row */}
          <View style={styles.destinoRow}>
            <View style={styles.destinoIconWrapper}>
              <MaterialIcons name="location-on" size={20} color={C.interactive} />
            </View>
            <View style={styles.destinoTextBlock}>
              <Text style={styles.destinoLabel}>
                {t('passageiro.bottomSheet.destinoLabel')}
              </Text>
              <Text
                style={hasDestination ? styles.destinoValue : styles.destinoPlaceholder}
                testID="destino-value">
                {selectedDestinoLabel ?? t('passageiro.bottomSheet.destinoPlaceholder')}
              </Text>
            </View>
          </View>

          {/* Route preview status */}
          {canPreviewRoute && (
            <View style={styles.routeStatusWrap} testID="route-status">
              {isRouting ? (
                <View style={styles.routeLoadingRow}>
                  <ActivityIndicator color={C.interactive} size="small" testID="route-loading" />
                  <Text style={styles.routeStatusText}>{t('pesquisa.route.loading')}</Text>
                </View>
              ) : routeSummary ? (
                <Text style={styles.routeSummaryText} testID="route-summary">
                  {routeSummary}
                </Text>
              ) : routeFeedback ? (
                <Text style={styles.routeErrorText} testID="route-error">
                  {routeFeedback}
                </Text>
              ) : (
                <Text style={styles.routeStatusText} testID="route-empty">
                  {t('pesquisa.route.empty')}
                </Text>
              )}
            </View>
          )}
        </>
      )}

      {/* CTA — always enabled */}
      <Pressable
        accessibilityLabel={
          hasDestination
            ? `${t('passageiro.bottomSheet.cta')} ${selectedDestinoLabel ?? ''}`
            : t('passageiro.bottomSheet.ctaSelectAddress')
        }
        accessibilityRole="button"
        onPress={handleCta}
        style={[styles.ctaButton, styles.ctaButtonLast]}
        testID="cta-solicitar">
        <Text style={styles.ctaButtonText}>
          {t('passageiro.bottomSheet.cta')}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

PassageiroIdleSheet.displayName = 'PassageiroIdleSheet';
