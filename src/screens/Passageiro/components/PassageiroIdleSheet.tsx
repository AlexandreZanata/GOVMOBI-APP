/**
 * @fileoverview PassageiroIdleSheet — bottom sheet shown when no active ride exists.
 * Contains destination selector, route preview, and the CTA button.
 */
import React from 'react';
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
  /** Whether the CTA button is disabled. */
  ctaDisabled: boolean;
  onOpenRequestModal: () => void;
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
  ctaDisabled,
  onOpenRequestModal,
}: PassageiroIdleSheetProps): React.JSX.Element => {
  const {t} = useTranslation();
  const styles = createPassageiroStyles();
  const hasDestination = !!selectedDestinoLabel;

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        styles.bottomSheet,
        {paddingBottom, transform: [{translateY: sheetTranslate}]},
      ]}
      testID="bottom-sheet">
      <View style={styles.dragHandle} />
      <View style={styles.bottomSheetHeader}>
        <View>
          <Text style={styles.bottomSheetTitle}>
            {t('passageiro.bottomSheet.title')}
          </Text>
          <Text style={styles.bottomSheetSubtitle}>
            {t('passageiro.searchBar.placeholder')}
          </Text>
        </View>
        <MaterialIcons name="expand-more" size={20} color={C.textMuted} />
      </View>

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

      {/* CTA */}
      <Pressable
        accessibilityLabel={
          hasDestination
            ? `${t('passageiro.bottomSheet.cta')} ${selectedDestinoLabel ?? ''}`
            : t('passageiro.bottomSheet.cta')
        }
        accessibilityRole="button"
        disabled={ctaDisabled}
        onPress={onOpenRequestModal}
        style={[
          styles.ctaButton,
          ctaDisabled && styles.ctaButtonDisabled,
        ]}
        testID="cta-solicitar">
        <Text style={styles.ctaButtonText}>{t('passageiro.bottomSheet.cta')}</Text>
      </Pressable>
    </Animated.View>
  );
};

PassageiroIdleSheet.displayName = 'PassageiroIdleSheet';
