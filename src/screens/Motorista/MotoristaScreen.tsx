/**
 * @fileoverview MotoristaScreen — placeholder for the driver experience.
 * Full implementation is handled in a separate task.
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '../../theme';

/**
 * Placeholder screen for the driver (motorista) experience.
 *
 * @returns JSX element for the motorista home screen.
 */
export const MotoristaScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const {design, spacing, typography: typo} = theme;

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, {backgroundColor: design.navy800}]}
      testID="motorista-screen">
      <View style={[styles.content, {gap: spacing[4]}]}>
        <MaterialIcons color={design.amber400} name="directions-car" size={64} />
        <Text
          style={{
            ...typo.scale.displayMd,
            color: design.textOnDark,
            textAlign: 'center',
          }}>
          {t('motorista.title')}
        </Text>
        <Text
          style={{
            ...typo.scale.bodyMd,
            color: design.textOnDarkMuted,
            textAlign: 'center',
          }}>
          {t('motorista.subtitle')}
        </Text>
      </View>
    </SafeAreaView>
  );
};

MotoristaScreen.displayName = 'MotoristaScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
