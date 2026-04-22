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
  type LayoutChangeEvent,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useNavigation} from '@react-navigation/native';
import type {CompositeNavigationProp} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useMotorista} from './useMotorista';
import {useMotoristaRealtime} from './useMotoristaRealtime';import {NovaCorridaModal} from './components/NovaCorridaModal';
import {createMotoristaStyles, MotoristaColors as C} from './MotoristaScreen.styles';
import {createHistoricoStyles} from '@screens/Corridas/HistoricoCorridas.styles';
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
  const theme = useTheme();
  const styles = useMemo(() => createMotoristaStyles(theme), [theme]);
  const hs = useMemo(() => createHistoricoStyles(theme), [theme]);
  const navigation = useNavigation<MotoristaNavProp>();

  const cameraRef = useRef<{flyTo: (coordinates: [number, number], duration?: number) => void} | null>(null);

  const {
    userLocation,
    mapRegion,
    activeCorrida,
    isActionLoading,
    onCenterOnUser: onCenterOnUserBase,
    onIniciarDeslocamento,
    onChegar,
    onConfirmarEmbarque,
    onFinalizar,
    onCancelar,
    onAceitar,
    onRecusar,
    statusOperacional,
    isTogglingStatus,
    onToggleStatus,
  } = useMotorista();

  // Wraps the hook's center handler and also animates the Mapbox camera.
  const onCenterOnUser = useCallback(() => {
    onCenterOnUserBase();
    if (userLocation) {
      cameraRef.current?.flyTo(
        [userLocation.longitude, userLocation.latitude],
        600,
      );
    }
  }, [onCenterOnUserBase, userLocation]);

  // Realtime: location streaming + nova-corrida-disponivel modal
  const {pendingOffer, dismissOffer} = useMotoristaRealtime(userLocation);

  const [cancelMotivo, setCancelMotivo] = useState('');
  const [showCancelInput, setShowCancelInput] = useState(false);
  const [recusaMotivo, setRecusaMotivo] = useState('');
  const [showRecusaInput, setShowRecusaInput] = useState(false);

  const sheetTranslate = useRef(new Animated.Value(0)).current;
  const sheetAnimated = useRef(false);
  // Measured height of the bottom sheet — used to position the chat FAB above it
  const [sheetHeight, setSheetHeight] = useState(0);

  const hasActiveRide = activeCorrida !== null && !TERMINAL_STATUSES.has(activeCorrida.status);
  const isTerminal = activeCorrida !== null && TERMINAL_STATUSES.has(activeCorrida.status);

  const onSheetLayout = useCallback((event: LayoutChangeEvent) => {
    const h = event.nativeEvent.layout.height;
    if (h > 0) setSheetHeight(h);
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
    void onAceitar(activeCorrida.id, {});
  }, [activeCorrida, onAceitar]);

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
      posicaoLat: userLocation?.latitude ?? activeCorrida.origemLat,
      posicaoLng: userLocation?.longitude ?? activeCorrida.origemLng,
    });
  }, [activeCorrida, onConfirmarEmbarque, userLocation]);

  const handleFinalizar = useCallback(() => {
    if (!activeCorrida) return;
    // ficar-disponivel is emitted by useMotoristaRealtime when activeCorrida reaches terminal status
    void onFinalizar(activeCorrida.id, {
      posicaoFinalLat: userLocation?.latitude ?? activeCorrida.destinoLat,
      posicaoFinalLng: userLocation?.longitude ?? activeCorrida.destinoLng,
    });
  }, [activeCorrida, onFinalizar, userLocation]);

  const handleCancelar = useCallback(() => {
    if (!activeCorrida) return;
    void onCancelar(activeCorrida.id, cancelMotivo.trim()).then(() => {
      setCancelMotivo('');
      setShowCancelInput(false);
    });
  }, [activeCorrida, cancelMotivo, onCancelar]);

  const handleOpenMessages = useCallback(() => {
    if (!activeCorrida) return;
    navigation.navigate('MotoristaCorridas', {
      screen: 'CorridaMensagens',
      params: {corridaId: activeCorrida.id},
    });
  }, [activeCorrida, navigation]);

  // ── Nova corrida offer handlers ──────────────────────────────────────────

  const handleAcceptOffer = useCallback((corridaId: string) => {
    dismissOffer();
    void onAceitar(corridaId, {});
  }, [dismissOffer, onAceitar]);

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
        scaleBarEnabled={false}
        onDidFinishLoadingMap={() => console.info('[Mapbox][Motorista] Map loaded')}
        onMapLoadingError={(e?: unknown) => console.error('[Mapbox][Motorista] Error', e)}
        style={styles.map}
        styleURL="mapbox://styles/mapbox/light-v11"
        testID="motorista-map">
        <MapboxGL.Camera
          ref={cameraRef}
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
        {hasActiveRide && activeCorrida && Number.isFinite(activeCorrida.destinoLng) && Number.isFinite(activeCorrida.destinoLat) && (
          <MapboxGL.PointAnnotation
            coordinate={[activeCorrida.destinoLng, activeCorrida.destinoLat]}
            id="ride-destination"
            title={t('corridas.detail.destino')}>
            <View style={styles.destinationPin} />
          </MapboxGL.PointAnnotation>
        )}
        {hasActiveRide && activeCorrida && Number.isFinite(activeCorrida.origemLng) && Number.isFinite(activeCorrida.origemLat) && (
          <MapboxGL.PointAnnotation
            coordinate={[activeCorrida.origemLng, activeCorrida.origemLat]}
            id="ride-origin"
            title={t('corridas.detail.origem')}>
            <View style={styles.originPin} />
          </MapboxGL.PointAnnotation>
        )}
      </MapboxGL.MapView>
    ) : (
      <View style={styles.mapFallback} testID="map-fallback">
        <MaterialIcons name="map" size={56} color={C.textMuted} />
        <Text style={styles.mapFallbackText}>{t('passageiro.map.notInstalled')}</Text>
      </View>
    );

  const sheetPaddingBottom = 14;
  const fabTop = 12;
  // FAB sits 16px above the sheet — dynamically computed from measured sheet height.
  // Falls back to 80px until the first layout event fires.
  const FAB_GAP = 16;
  const chatFabBottom = sheetHeight > 0 ? sheetHeight + FAB_GAP : 80;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, {backgroundColor: theme.colors.primary}]} testID="motorista-home-screen">
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      {/* Header bar — same style as My Rides titleRow */}
      <View style={[hs.titleRow, styles.statusHeaderRow]} testID="status-header">
        <View style={styles.statusPillDotOnly}>
          <View style={[styles.statusPillDot, {backgroundColor: hasActiveRide ? C.success : C.warning}]} />
        </View>
        <Text style={hs.headerTitle}>
          {hasActiveRide && activeCorrida
            ? t(`corridas.status.${activeCorrida.status}`)
            : t('motorista.status.disponivel')}
        </Text>
      </View>

      {/* Map area */}
      <View style={styles.mapWrapper}>
        {/* Layer 1: Map */}
        {mapContent}

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
            style={[styles.fab, styles.fabLocation]}
            testID="fab-center">
            <MaterialIcons name="my-location" size={20} color={C.textOnDark} />
          </Pressable>
        </View>

        {/* Chat FAB — only when ride is active */}
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

        {/* Bottom sheet — three states */}
        {!hasActiveRide && !isTerminal && (
          <MotoristaIdleSheet
            isTogglingStatus={isTogglingStatus}
            onLayout={onSheetLayout}
            onToggleStatus={onToggleStatus}
            paddingBottom={sheetPaddingBottom}
            sheetTranslate={sheetTranslate}
            statusOperacional={statusOperacional}
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
            onIniciarDeslocamento={handleIniciarDeslocamento}
            onLayout={onSheetLayout}
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
    </SafeAreaView>
  );
};

MotoristaScreen.displayName = 'MotoristaScreen';
