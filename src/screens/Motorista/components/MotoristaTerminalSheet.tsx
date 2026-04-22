/**
 * @fileoverview MotoristaTerminalSheet — bottom sheet shown when a ride reaches a terminal state.
 */
import React from 'react';
import {Animated, Text, View, type LayoutChangeEvent} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {createMotoristaStyles, MotoristaColors as C} from '../MotoristaScreen.styles';
import {useTheme} from '@theme/index';
import type {Corrida} from '@models/Corrida';

export interface MotoristaTerminalSheetProps {
  /** The terminal corrida. */
  corrida: Corrida;
  /** Animated translateY value for the slide-up entrance. */
  sheetTranslate: Animated.Value;
  /** Bottom padding to respect safe area. */
  paddingBottom: number;
  /** Called when the sheet layout is measured. */
  onLayout: (event: LayoutChangeEvent) => void;
}

/**
 * Terminal state bottom sheet for the driver home screen.
 * Shown when the active ride is FINALIZADA, CANCELADA, or RECUSADA.
 *
 * @param props - {@link MotoristaTerminalSheetProps}
 * @returns JSX element for the terminal sheet.
 */
export const MotoristaTerminalSheet = ({
  corrida,
  sheetTranslate,
  paddingBottom,
  onLayout,
}: MotoristaTerminalSheetProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createMotoristaStyles(theme);

  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        styles.activeSheet,
        {paddingBottom, transform: [{translateY: sheetTranslate}]},
      ]}
      testID="terminal-sheet">
      <View style={styles.dragHandle} />
      <View style={styles.terminalContainer}>
        <MaterialIcons
          name={corrida.status === 'FINALIZADA' ? 'check-circle' : 'cancel'}
          size={48}
          color={corrida.status === 'FINALIZADA' ? C.success : C.danger}
        />
        <Text style={styles.terminalText}>
          {t(`corridas.terminal.${corrida.status}`)}
        </Text>
      </View>
    </Animated.View>
  );
};

MotoristaTerminalSheet.displayName = 'MotoristaTerminalSheet';
