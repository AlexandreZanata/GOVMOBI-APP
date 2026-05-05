/**
 * @fileoverview CorridasListScreen — shows the active corrida or an empty state.
 *
 * Entry point for the Corridas tab. If there is an active corrida, shows its
 * status card with a CTA to track or act on it. Otherwise shows an empty state.
 */
import React, {useCallback, useEffect, useMemo} from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme} from '../../theme';
import {useCorridas} from './useCorridas';
import {createCorridasStyles, statusColor} from './CorridasScreens.styles';
import type {CorridasStackParamList} from '@navigation/types';
import {useFacades} from '@services/facades';
import {useAppDispatch} from '../../store';
import {setActiveCorrida} from '@store/slices/corridaSlice';

type NavProp = NativeStackNavigationProp<CorridasStackParamList>;

/**
 * Corridas list / home screen.
 * Shows the active corrida card or an empty state with a CTA to request a ride.
 *
 * @returns JSX element for the CorridasListScreen.
 */
export const CorridasListScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const dispatch = useAppDispatch();
  const {corridaFacade} = useFacades();

  const styles = useMemo(() => createCorridasStyles(theme), [theme]);

  const {activeCorrida, isMotorista, isPassageiro} = useCorridas();

  // Load active corrida on mount
  useEffect(() => {
    const load = async (): Promise<void> => {
      const result = await corridaFacade.getActiveCorrida();
      if (result.data) {
        dispatch(setActiveCorrida(result.data));
      }
    };
    void load();
  }, [corridaFacade, dispatch]);

  const handleViewCorrida = useCallback(() => {
    if (!activeCorrida) return;
    if (isMotorista) {
      navigation.navigate('MotoristaCorridaAction', {corridaId: activeCorrida.id});
    } else {
      navigation.navigate('AcompanharCorrida', {corridaId: activeCorrida.id});
    }
  }, [activeCorrida, isMotorista, navigation]);

  const handleRequestRide = useCallback(() => {
    navigation.navigate('SolicitarCorrida');
  }, [navigation]);

  const badgeColor = activeCorrida ? statusColor(activeCorrida.status, theme) : theme.colors.textMuted;

  return (
    <View
      style={[styles.container, {paddingTop: insets.top}]}
      testID="corridas-list-screen">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.sectionHeader}>{t('corridas.list.title')}</Text>

        {activeCorrida ? (
          <Pressable
            accessibilityLabel={t('corridas.list.viewActive')}
            accessibilityRole="button"
            onPress={handleViewCorrida}
            style={styles.card}
            testID="active-corrida-card">
            {/* Status badge */}
            <View style={[styles.statusBadge, {backgroundColor: badgeColor}]}>
              <Text style={styles.statusText}>
                {t(`corridas.status.${activeCorrida.status}`)}
              </Text>
            </View>

            <View style={styles.cardRow}>
              <MaterialIcons
                name="trip-origin"
                size={18}
                color={theme.colors.success}
                style={styles.cardRowIcon}
              />
              <View>
                <Text style={styles.cardLabel}>{t('corridas.detail.origem')}</Text>
                <Text style={styles.cardValue}>
                  {`${activeCorrida.origemLat.toFixed(4)}, ${activeCorrida.origemLng.toFixed(4)}`}
                </Text>
              </View>
            </View>

            <View style={styles.cardRow}>
              <MaterialIcons
                name="location-on"
                size={18}
                color={theme.colors.error}
                style={styles.cardRowIcon}
              />
              <View>
                <Text style={styles.cardLabel}>{t('corridas.detail.destino')}</Text>
                <Text style={styles.cardValue}>
                  {`${activeCorrida.destinoLat.toFixed(4)}, ${activeCorrida.destinoLng.toFixed(4)}`}
                </Text>
              </View>
            </View>

            <View style={styles.cardRowLast}>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={theme.colors.textMuted}
                style={styles.chevronRight}
              />
            </View>
          </Pressable>
        ) : (
          <View style={styles.emptyContainer} testID="corridas-empty">
            <MaterialIcons name="directions-car" size={56} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>{t('corridas.list.empty.title')}</Text>
            <Text style={styles.emptySubtitle}>{t('corridas.list.empty.subtitle')}</Text>

            {isPassageiro && (
              <Pressable
                accessibilityLabel={t('corridas.list.requestRide')}
                accessibilityRole="button"
                onPress={handleRequestRide}
                style={[
                  styles.actionButton,
                  styles.actionButtonPrimary,
                  styles.fullWidthButton,
                  {marginTop: theme.spacing[6]},
                ]}
                testID="btn-request-ride">
                <Text style={styles.actionButtonText}>{t('corridas.list.requestRide')}</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

CorridasListScreen.displayName = 'CorridasListScreen';
