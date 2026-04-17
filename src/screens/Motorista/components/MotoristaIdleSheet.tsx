/**
 * @fileoverview MotoristaIdleSheet — bottom sheet shown when the driver has no active ride.
 */
import React from 'react';
import {Animated, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {createMotoristaStyles, MotoristaColors as C} from '../MotoristaScreen.styles';
import {useTheme} from '@theme/index';
import {useAppSelector} from '../../../store';

export interface MotoristaIdleSheetProps {
  /** Animated translateY value for the slide-up entrance. */
  sheetTranslate: Animated.Value;
  /** Bottom padding to respect safe area. */
  paddingBottom: number;
  /** Called when the sheet layout is measured (triggers slide-up animation). */
  onLayout: () => void;
}

/**
 * Idle bottom sheet for the driver home screen.
 * Shown when no active ride is present.
 *
 * @param props - {@link MotoristaIdleSheetProps}
 * @returns JSX element for the idle sheet.
 */
export const MotoristaIdleSheet = ({
  sheetTranslate,
  paddingBottom,
  onLayout,
}: MotoristaIdleSheetProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createMotoristaStyles(theme);
  const connectionStatus = useAppSelector(s => s.realtime.connectionStatus);

  const realtimeDotColor =
    connectionStatus === 'connected'
      ? C.success
      : connectionStatus === 'connecting'
        ? C.warning
        : C.danger;

  const realtimeLabel = t(`motorista.realtime.${connectionStatus}`, {
    defaultValue: t('motorista.realtime.disconnected'),
  });

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        styles.idleSheet,
        {paddingBottom, transform: [{translateY: sheetTranslate}]},
      ]}
      testID="idle-sheet">
      <Text style={styles.idleTitle}>{t('motorista.idle.title')}</Text>
      <Text style={styles.idleSubtitle}>{t('motorista.idle.subtitle')}</Text>
      <View style={styles.statusIndicatorRow} testID="realtime-status-row">
        <View style={[styles.statusDot, {backgroundColor: realtimeDotColor}]} />
        <Text style={styles.statusLabel}>{realtimeLabel}</Text>
      </View>
    </Animated.View>
  );
};

MotoristaIdleSheet.displayName = 'MotoristaIdleSheet';
