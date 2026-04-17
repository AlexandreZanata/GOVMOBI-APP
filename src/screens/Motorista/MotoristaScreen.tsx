/**
 * @fileoverview MotoristaScreen — driver home screen with map + active ride panel.
 *
 * Z-layers (bottom → top):
 *   1. MapboxMap          full-screen base layer
 *   2. Status pill        floating top-center, z=10
 *   3. Right FAB column   floating buttons, z=10
 *   4. Bottom sheet       white card — idle / active / terminal, z=20
 *   5. Chat FAB           above bottom sheet when ride is active, z=25
 *   6. Loading overlay    z=100
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StatusBar,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useNavigation} from '@react-navigation/native';
import type {CompositeNavigationProp} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useMotorista} from './useMotorista';
import {useMotoristaRealtime} from './useMotoristaRealtime';
import {NovaCorridaModal} from './components/NovaCorridaModal';
import {createMotoristaStyles, MotoristaColors as C} from './MotoristaScreen.styles';
import {useAppSelector} from '../../store';
import {useTheme} from '../../theme';
import {MapboxGL} from '@components/molecules/MapboxContainer';
import {MotoristaIdleSheet} from './components/MotoristaIdleSheet';
import {MotoristaTerminalSheet} from './components/MotoristaTerminalSheet';
import {MotoristaActiveSheet} from './components/MotoristaActiveSheet';
import type {MotoristaTabParamList, MotoristaCorridasStackParamList} from '@navigation/types';

type MotoristaNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MotoristaTabParamList, 'MotoristaHome'>,
  NativeStackNavigationProp<MotoristaCorridasStackParamList>
>;

const TERMINAL_STATUSES = new Set<string>(['FINALIZADA', 'CANCELADA', 'RECUSADA']);

/**
 * Driver home screen — map + active ride panel.
 *
 * @returns JSX element for the MotoristaScreen.
 */
export const MotoristaScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => createMotoristaStyles(theme), [theme]);
  const navigation = useNavigation<MotoristaNavProp>();

  const userId = useAppSelector(s => s.auth.user?.id ?? 'motorista-current');

  const {
    userLocation,
    mapRegion,
    activeCorrida,
    isActionLoading,
    onCenterOnUser,
    onIniciarDeslocamento,
    onChegar,
    onConfirmarEmbarque,
    onFinalizar,
    onCancelar,
    onAceitar,
    onRecusar,
  } = useMotorista();

  // Realtime: location streaming + nova-corrida-disponivel modal
  const {pendingOffer, dismissOffer} = useMotoristaRealtime(userLocation);

  const [cancelMotivo, setCancelMotivo] = useState('');
  const [showCancelInput, setShowCancelInput] = useState(false);
  const [recusaMotivo, setRecusaMotivo] = useState('');
  const [showRecusaInput, setShowRecusaInput] = useState(false);

  const sheetTranslate = useRef(new Animated.Value(0)).current;
  const sheetAnimated = useRef(false);

  const hasActiveRide = activeCorrida !== null && !TERMINAL_STATUSES.has(activeCorrida.status);
  const isTerminal = activeCorrida !== null && TERMINAL_STATUSES.has(activeCorrida.status);

  const onSheetLayout = useCallback(() => {
    if (sheetAnimated.current) return;
    sheetAnimated.current = true;
    sheetTranslate.setValue(200);
    Animated.timing(sheetTranslate, {toValue: 0, duration: 280, useNativeDriver: true}).start();
  }, [sheetTranslate]);

  useEffect(() => {
    sheetAnimated.current = false;
  }, [hasActiveRide]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAceitar = useCallback(() => {
    if (!activeCorrida) return;
    void onAceitar(activeCorrida.id, {motoristaId: userId, veiculoId: 'veiculo-assigned'});
  }, [activeCorrida, onAceitar, userId]);

  const handleRecusar = useCallback(() => {
    if (!activeCorrida) return;
    void onRecusar(activeCorrida.id, recusaMotivo || undefined).then(() => {
      setRecusaMotivo('');
      setShowRecusaInput(false);
    });
  }, [activeCorrida, onRecusar, recusaMotivo]);

  const handleIniciarDeslocamento = useCallback(() => {
    if (!activeCorrida) return;
    void onIniciarDeslocamento(activeCorrida.id);
  }, [activeCorrida, onIniciarDeslocamento]);

  const handleChegar = useCallback(() => {
    if (!activeCorrida) return;
    void onChegar(activeCorrida.id);
  }, [activeCorrida, onChegar]);

  const handleConfirmarEmbarque = useCallback(() => {
    if (!activeCorrida) return;
    void onConfirmarEmbarque(activeCorrida.id, {
      motoristaId: userId,
      posicaoLat: userLocation?.latitude ?? activeCorrida.origemLat,
      posicaoLng: userLocation?.longitude ?? activeCorrida.origemLng,
    });
  }, [activeCorrida, onConfirmarEmbarque, userId, userLocation]);

  const handleFinalizar = useCallback(() => {
    if (!activeCorrida) return;
    void onFinalizar(activeCorrida.id, {
      motoristaId: userId,
      posicaoFinalLat: userLocation?.latitude ?? activeCorrida.destinoLat,
      posicaoFinalLng: userLocation?.longitude ?? activeCorrida.destinoLng,
    });
  }, [activeCorrida, onFinalizar, userId, userLocation]);

  const handleCancelar = useCallback(() => {
    if (!activeCorrida) return;
    void onCancelar(activeCorrida.id, cancelMotivo.trim()).then(() => {
      setCancelMotivo('');
      setShowCancelInput(false);
    });
  }, [activeCorrida, cancelMotivo, onCancelar]);

  const handleOpenMessages = useCallback(() => {
    if (!activeCorrida) return;
    navigation.navigate('CorridaMensagens', {corridaId: activeCorrida.id});
  }, [activeCorrida, navigation]);

  // ── Nova corrida offer handlers ──────────────────────────────────────────

  const handleAcceptOffer = useCallback((corridaId: string) => {
    dismissOffer();
    void onAceitar(corridaId, {motoristaId: userId, veiculoId: 'veiculo-assigned'});
  }, [dismissOffer, onAceitar, userId]);

  const handleRefuseOffer = useCallback((corridaId: string) => {
    dismissOffer();
    void onRecusar(corridaId);
  }, [dismissOffer, onRecusar]);

  // ── Map ─────────────────────────────────────────────────────────────────────
  const mapContent =
    MapboxGL ? (
      <MapboxGL.MapView
        accessibilityLabel={t('motorista.map.label')}
        logoEnabled={false}
        attributionEnabled={false}
        onDidFinishLoadingMap={() => console.info('[Mapbox][Motorista] Map loaded')}
        onMapLoadingError={(e?: unknown) => console.error('[Mapbox][Motorista] Error', e)}
        style={styles.map}
        styleURL="mapbox://styles/mapbox/light-v11"
        testID="motorista-map">
        <MapboxGL.Camera
          animationDuration={600}
          centerCoordinate={[mapRegion.longitude, mapRegion.latitude]}
          zoomLevel={mapRegion.zoomLevel}
        />
        {userLocation && (
          <MapboxGL.PointAnnotation
            coordinate={[userLocation.longitude, userLocation.latitude]}
            id="driver-location"
            title={t('motorista.map.driverLocation')}>
            <View style={styles.userMarkerPulse} testID="driver-marker">
              <View style={styles.userMarkerRing}>
                <View style={styles.userMarkerDot} />
              </View>
            </View>
          </MapboxGL.PointAnnotation>
        )}
        {hasActiveRide && activeCorrida && (
          <MapboxGL.PointAnnotation
            coordinate={[activeCorrida.destinoLng, activeCorrida.destinoLat]}
            id="ride-destination"
            title={t('corridas.detail.destino')}>
            <View style={styles.destinationPin} />
          </MapboxGL.PointAnnotation>
        )}
      </MapboxGL.MapView>
    ) : (
      <View style={styles.mapFallback} testID="map-fallback">
        <MaterialIcons name="map" size={56} color={C.textMuted} />
        <Text style={styles.mapFallbackText}>{t('passageiro.map.notInstalled')}</Text>
      </View>
    );

  const sheetPaddingBottom = insets.bottom > 0 ? insets.bottom : 14;
  const fabTop = insets.top + 10 + 54 + 12;
  const chatFabBottom = 220 + sheetPaddingBottom;

  return (
    <View style={styles.container} testID="motorista-home-screen">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Layer 1: Map */}
      {mapContent}

      {/* Layer 2: Status pill */}
      <View style={[styles.statusPillWrapper, {top: insets.top + 10}]} testID="status-pill-wrapper">
        <View style={styles.statusPill}>
          <View
            style={[styles.statusPillDot, {backgroundColor: hasActiveRide ? C.success : C.warning}]}
          />
          <Text style={styles.statusPillText}>
            {hasActiveRide && activeCorrida
              ? t(`corridas.status.${activeCorrida.status}`)
              : t('motorista.status.disponivel')}
          </Text>
        </View>
      </View>

      {/* Layer 3: Right FAB column */}
      <View style={[styles.fabColumn, {top: fabTop}]} testID="fab-column">
        <Pressable
          accessibilityLabel={t('common.notifications')}
          accessibilityRole="button"
          style={styles.fab}
          testID="fab-notifications">
          <MaterialIcons name="notifications" size={20} color={C.textOnDark} />
          <View style={styles.fabBadge} />
        </Pressable>
        <Pressable
          accessibilityLabel={t('passageiro.map.centerOnUser')}
          accessibilityRole="button"
          onPress={onCenterOnUser}
          style={styles.fab}
          testID="fab-center">
          <MaterialIcons name="my-location" size={20} color={C.textOnDark} />
        </Pressable>
      </View>

      {/* Layer 5: Chat FAB — only when ride is active */}
      {hasActiveRide && (
        <Pressable
          accessibilityLabel={t('corridas.mensagens.title')}
          accessibilityRole="button"
          onPress={handleOpenMessages}
          style={[styles.chatFab, {bottom: chatFabBottom}]}
          testID="chat-fab">
          <MaterialIcons name="chat" size={24} color={C.textOnDark} />
        </Pressable>
      )}

      {/* Layer 4: Bottom sheet — three states */}
      {!hasActiveRide && !isTerminal && (
        <MotoristaIdleSheet
          onLayout={onSheetLayout}
          paddingBottom={sheetPaddingBottom}
          sheetTranslate={sheetTranslate}
        />
      )}

      {isTerminal && activeCorrida && (
        <MotoristaTerminalSheet
          corrida={activeCorrida}
          onLayout={onSheetLayout}
          paddingBottom={sheetPaddingBottom}
          sheetTranslate={sheetTranslate}
        />
      )}

      {hasActiveRide && activeCorrida && (
        <MotoristaActiveSheet
          cancelMotivo={cancelMotivo}
          corrida={activeCorrida}
          isActionLoading={isActionLoading}
          onAceitar={handleAceitar}
          onCancelar={handleCancelar}
          onCancelMotivoChange={setCancelMotivo}
          onChegar={handleChegar}
          onConfirmarEmbarque={handleConfirmarEmbarque}
          onFinalizar={handleFinalizar}
          onIniciarDeslocamento={handleIniciarDeslocamento}          onLayout={onSheetLayout}
          onRecusar={handleRecusar}
          onRecusaMotivoChange={setRecusaMotivo}
          onShowCancelInput={() => setShowCancelInput(true)}
          onShowRecusaInput={() => setShowRecusaInput(true)}
          paddingBottom={sheetPaddingBottom}
          recusaMotivo={recusaMotivo}
          sheetTranslate={sheetTranslate}
          showCancelInput={showCancelInput}
          showRecusaInput={showRecusaInput}
        />
      )}

      {/* Nova corrida offer modal */}
      {pendingOffer && (
        <NovaCorridaModal
          isLoading={isActionLoading}
          offer={pendingOffer}
          onAccept={handleAcceptOffer}
          onRefuse={handleRefuseOffer}
        />
      )}

      {/* Loading overlay */}
      {isActionLoading && (
        <View style={styles.loadingOverlay} testID="loading-overlay">
          <ActivityIndicator color={C.textOnDark} size="large" />
        </View>
      )}
    </View>
  );
};

MotoristaScreen.displayName = 'MotoristaScreen';
