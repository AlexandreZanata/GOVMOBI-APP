/**
 * @fileoverview MotoristaScreen — driver home screen with map + active ride panel.
 *
 * Z-layers (bottom → top):
 *   1. MapboxMap          full-screen base layer (shows ride route when active)
 *   2. Status pill        floating top-center, z=10
 *   3. Right FAB column   floating buttons, z=10
 *   4. Bottom sheet       white card — idle OR active ride panel, z=20
 *   5. Chat FAB           above bottom sheet when ride is active, z=25
 *   6. Loading overlay    z=100
 *
 * When a ride is active:
 *   - The route from driver → destination is drawn on the map
 *   - The bottom sheet shows: status, addresses, lifecycle action buttons
 *   - A chat FAB appears above the bottom sheet
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  StatusBar,
  Text,
  TextInput,
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
import {
  createMotoristaStyles,
  MotoristaColors as C,
} from './MotoristaScreen.styles';
import {ENV} from '../../config/env';
import {useAppSelector} from '../../store';
import {statusColor} from '@screens/Corridas/CorridasScreens.styles';
import {useTheme} from '../../theme';
import type {MotoristaTabParamList, MotoristaCorridasStackParamList} from '@navigation/types';

type MotoristaNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MotoristaTabParamList, 'MotoristaHome'>,
  NativeStackNavigationProp<MotoristaCorridasStackParamList>
>;

// ── Mapbox lazy-load (mirrors PassageiroScreen) ───────────────────────────────
type MapboxModule = {
  setAccessToken: (token: string) => void;
  MapView: React.ComponentType<{
    style?: object;
    styleURL?: string;
    logoEnabled?: boolean;
    attributionEnabled?: boolean;
    onDidFinishLoadingMap?: () => void;
    onMapLoadingError?: (error?: unknown) => void;
    testID?: string;
    accessibilityLabel?: string;
    children?: React.ReactNode;
  }>;
  Camera: React.ComponentType<{
    centerCoordinate?: [number, number];
    zoomLevel?: number;
    animationDuration?: number;
  }>;
  PointAnnotation: React.ComponentType<{
    id: string;
    coordinate: [number, number];
    title?: string;
    children?: React.ReactNode;
  }>;
  ShapeSource: React.ComponentType<{
    id: string;
    shape: {
      type: 'Feature';
      geometry: {type: 'LineString'; coordinates: [number, number][]};
      properties: Record<string, unknown>;
    };
    children?: React.ReactNode;
  }>;
  LineLayer: React.ComponentType<{
    id: string;
    style?: {
      lineColor?: string;
      lineWidth?: number;
      lineOpacity?: number;
      lineCap?: 'round' | 'butt' | 'square';
      lineJoin?: 'round' | 'bevel' | 'miter';
    };
  }>;
};

let MapboxGL: MapboxModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@rnmapbox/maps') as {
    default: {setAccessToken: (t: string) => void};
    MapView: MapboxModule['MapView'];
    Camera: MapboxModule['Camera'];
    PointAnnotation: MapboxModule['PointAnnotation'];
    ShapeSource: MapboxModule['ShapeSource'];
    LineLayer: MapboxModule['LineLayer'];
  };
  if (ENV.MAPBOX_ACCESS_TOKEN) {
    mod.default.setAccessToken(ENV.MAPBOX_ACCESS_TOKEN);
  }
  MapboxGL = {
    setAccessToken: mod.default.setAccessToken.bind(mod.default),
    MapView: mod.MapView,
    Camera: mod.Camera,
    PointAnnotation: mod.PointAnnotation,
    ShapeSource: mod.ShapeSource,
    LineLayer: mod.LineLayer,
  };
} catch {
  MapboxGL = null;
}

const TERMINAL_STATUSES = new Set<string>(['FINALIZADA', 'CANCELADA', 'RECUSADA']);

/**
 * Driver home screen — map + active ride panel.
 * All ride lifecycle actions happen here; the driver never leaves while a ride is active.
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

  const [isContainerReady, setIsContainerReady] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [showCancelInput, setShowCancelInput] = useState(false);
  const [recusaMotivo, setRecusaMotivo] = useState('');
  const [showRecusaInput, setShowRecusaInput] = useState(false);

  const sheetTranslate = useRef(new Animated.Value(0)).current;
  const sheetAnimated = useRef(false);

  const hasActiveRide = activeCorrida !== null && !TERMINAL_STATUSES.has(activeCorrida.status);
  const isTerminal = activeCorrida !== null && TERMINAL_STATUSES.has(activeCorrida.status);

  // ── Sheet slide-up ──────────────────────────────────────────────────────────
  const onSheetLayout = useCallback(() => {
    if (sheetAnimated.current) return;
    sheetAnimated.current = true;
    sheetTranslate.setValue(200);
    Animated.timing(sheetTranslate, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [sheetTranslate]);

  // Reset sheet animation when ride state changes
  useEffect(() => {
    sheetAnimated.current = false;
  }, [hasActiveRide]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAceitar = useCallback(() => {
    if (!activeCorrida) return;
    void onAceitar(activeCorrida.id, {
      motoristaId: userId,
      veiculoId: 'veiculo-assigned', // resolved from driver profile in production
    });
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
    Alert.alert(
      t('corridas.finalizar.title'),
      t('corridas.finalizar.confirm'),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('common.confirm'),
          onPress: () => {
            void onFinalizar(activeCorrida.id, {
              motoristaId: userId,
              posicaoFinalLat: userLocation?.latitude ?? activeCorrida.destinoLat,
              posicaoFinalLng: userLocation?.longitude ?? activeCorrida.destinoLng,
            });
          },
        },
      ],
    );
  }, [activeCorrida, onFinalizar, t, userId, userLocation]);

  const handleCancelar = useCallback(() => {
    if (!cancelMotivo.trim()) {
      Alert.alert(t('corridas.cancel.title'), t('corridas.cancel.motivoRequired'));
      return;
    }
    if (!activeCorrida) return;
    Alert.alert(t('corridas.cancel.title'), t('corridas.cancel.confirm'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: () => {
          void onCancelar(activeCorrida.id, cancelMotivo.trim()).then(() => {
            setCancelMotivo('');
            setShowCancelInput(false);
          });
        },
      },
    ]);
  }, [activeCorrida, cancelMotivo, onCancelar, t]);

  const handleOpenMessages = useCallback(() => {
    if (!activeCorrida) return;
    navigation.navigate('CorridaMensagens', {corridaId: activeCorrida.id});
  }, [activeCorrida, navigation]);

  // ── Map ─────────────────────────────────────────────────────────────────────
  const mapContent =
    MapboxGL && isContainerReady ? (
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
        {!MapboxGL ? (
          <>
            <MaterialIcons name="map" size={56} color={C.textMuted} />
            <Text style={styles.mapFallbackText}>{t('passageiro.map.notInstalled')}</Text>
          </>
        ) : (
          <ActivityIndicator color={C.interactive} size="large" testID="map-loading" />
        )}
      </View>
    );

  const badgeColor = activeCorrida ? statusColor(activeCorrida.status, theme) : C.interactive;
  const sheetPaddingBottom = insets.bottom > 0 ? insets.bottom : 14;
  const fabTop = insets.top + 10 + 54 + 12;
  const chatFabBottom = 220 + sheetPaddingBottom;

  return (
    <View
      style={styles.container}
      testID="motorista-home-screen"
      onLayout={() => setIsContainerReady(true)}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Layer 1: Map */}
      {mapContent}

      {/* Layer 2: Status pill */}
      <View style={[styles.statusPillWrapper, {top: insets.top + 10}]} testID="status-pill-wrapper">
        <View style={styles.statusPill}>
          <View
            style={[
              styles.statusPillDot,
              {backgroundColor: hasActiveRide ? C.success : C.warning},
            ]}
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

      {/* Layer 4: Bottom sheet */}
      {!hasActiveRide && !isTerminal ? (
        /* Idle sheet — waiting for rides */
        <Animated.View
          onLayout={onSheetLayout}
          style={[
            styles.idleSheet,
            {paddingBottom: sheetPaddingBottom, transform: [{translateY: sheetTranslate}]},
          ]}
          testID="idle-sheet">
          <View style={styles.dragHandle} />
          <Text style={styles.idleTitle}>{t('motorista.idle.title')}</Text>
          <Text style={styles.idleSubtitle}>{t('motorista.idle.subtitle')}</Text>
          <View style={styles.statusIndicatorRow}>
            <View style={[styles.statusDot, {backgroundColor: C.success}]} />
            <Text style={styles.statusLabel}>{t('motorista.status.disponivel')}</Text>
          </View>
        </Animated.View>
      ) : isTerminal && activeCorrida ? (
        /* Terminal state sheet */
        <Animated.View
          onLayout={onSheetLayout}
          style={[
            styles.activeSheet,
            {paddingBottom: sheetPaddingBottom, transform: [{translateY: sheetTranslate}]},
          ]}
          testID="terminal-sheet">
          <View style={styles.dragHandle} />
          <View style={styles.terminalContainer}>
            <MaterialIcons
              name={activeCorrida.status === 'FINALIZADA' ? 'check-circle' : 'cancel'}
              size={48}
              color={activeCorrida.status === 'FINALIZADA' ? C.success : C.danger}
            />
            <Text style={styles.terminalText}>
              {t(`corridas.terminal.${activeCorrida.status}`)}
            </Text>
          </View>
        </Animated.View>
      ) : hasActiveRide && activeCorrida ? (
        /* Active ride sheet */
        <Animated.View
          onLayout={onSheetLayout}
          style={[
            styles.activeSheet,
            {paddingBottom: sheetPaddingBottom, transform: [{translateY: sheetTranslate}]},
          ]}
          testID="active-ride-sheet">
          <View style={styles.dragHandle} />

          {/* Header: title + status badge */}
          <View style={styles.activeSheetHeader}>
            <Text style={styles.activeSheetTitle}>{t('motorista.activeRide.title')}</Text>
            <View style={[styles.statusBadge, {backgroundColor: badgeColor}]}>
              <Text style={styles.statusBadgeText}>
                {t(`corridas.status.${activeCorrida.status}`)}
              </Text>
            </View>
          </View>

          {/* Origin */}
          <View style={styles.routeRow}>
            <MaterialIcons name="trip-origin" size={18} color={C.success} />
            <View style={styles.routeTextBlock}>
              <Text style={styles.routeLabel}>{t('corridas.detail.origem')}</Text>
              <Text style={styles.routeValue} numberOfLines={1}>
                {`${activeCorrida.origemLat.toFixed(4)}, ${activeCorrida.origemLng.toFixed(4)}`}
              </Text>
            </View>
          </View>

          {/* Destination */}
          <View style={styles.routeRow}>
            <MaterialIcons name="location-on" size={18} color={C.danger} />
            <View style={styles.routeTextBlock}>
              <Text style={styles.routeLabel}>{t('corridas.detail.destino')}</Text>
              <Text style={styles.routeValue} numberOfLines={1}>
                {`${activeCorrida.destinoLat.toFixed(4)}, ${activeCorrida.destinoLng.toFixed(4)}`}
              </Text>
            </View>
          </View>

          {/* Lifecycle action buttons */}

          {/* SOLICITADA → Aceitar / Recusar */}
          {activeCorrida.status === 'SOLICITADA' && (
            <>
              <Pressable
                accessibilityLabel={t('corridas.actions.aceitar')}
                accessibilityRole="button"
                disabled={isActionLoading}
                onPress={handleAceitar}
                style={[styles.actionButton, styles.actionButtonSuccess, isActionLoading && styles.actionButtonDisabled]}
                testID="btn-aceitar">
                {isActionLoading ? (
                  <ActivityIndicator color={C.textOnDark} size="small" />
                ) : (
                  <Text style={styles.actionButtonText}>{t('corridas.actions.aceitar')}</Text>
                )}
              </Pressable>
              {showRecusaInput ? (
                <>
                  <TextInput
                    accessibilityLabel={t('corridas.recusar.motivoPlaceholder')}
                    onChangeText={setRecusaMotivo}
                    placeholder={t('corridas.recusar.motivoPlaceholder')}
                    placeholderTextColor={C.textMuted}
                    style={styles.cancelInput}
                    testID="recusa-input"
                    value={recusaMotivo}
                  />
                  <Pressable
                    accessibilityLabel={t('corridas.actions.recusar')}
                    accessibilityRole="button"
                    disabled={isActionLoading}
                    onPress={handleRecusar}
                    style={[styles.actionButton, styles.actionButtonDanger, isActionLoading && styles.actionButtonDisabled]}
                    testID="btn-recusar-confirm">
                    <Text style={styles.actionButtonText}>{t('corridas.actions.recusar')}</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  accessibilityLabel={t('corridas.actions.recusar')}
                  accessibilityRole="button"
                  onPress={() => setShowRecusaInput(true)}
                  style={[styles.actionButton, styles.actionButtonDanger]}
                  testID="btn-recusar">
                  <Text style={styles.actionButtonText}>{t('corridas.actions.recusar')}</Text>
                </Pressable>
              )}
            </>
          )}

          {/* ACEITA → Iniciar Deslocamento */}
          {activeCorrida.status === 'ACEITA' && (
            <Pressable
              accessibilityLabel={t('corridas.actions.iniciarDeslocamento')}
              accessibilityRole="button"
              disabled={isActionLoading}
              onPress={handleIniciarDeslocamento}
              style={[styles.actionButton, styles.actionButtonPrimary, isActionLoading && styles.actionButtonDisabled]}
              testID="btn-iniciar-deslocamento">
              {isActionLoading ? (
                <ActivityIndicator color={C.textOnDark} size="small" />
              ) : (
                <Text style={styles.actionButtonText}>{t('corridas.actions.iniciarDeslocamento')}</Text>
              )}
            </Pressable>
          )}

          {/* EM_DESLOCAMENTO → Chegar */}
          {activeCorrida.status === 'EM_DESLOCAMENTO' && (
            <Pressable
              accessibilityLabel={t('motorista.actions.chegar')}
              accessibilityRole="button"
              disabled={isActionLoading}
              onPress={handleChegar}
              style={[styles.actionButton, styles.actionButtonPrimary, isActionLoading && styles.actionButtonDisabled]}
              testID="btn-chegar">
              {isActionLoading ? (
                <ActivityIndicator color={C.textOnDark} size="small" />
              ) : (
                <Text style={styles.actionButtonText}>{t('motorista.actions.chegar')}</Text>
              )}
            </Pressable>
          )}

          {/* EM_DESLOCAMENTO / ACEITA → Confirmar Embarque */}
          {(activeCorrida.status === 'EM_DESLOCAMENTO' || activeCorrida.status === 'ACEITA') && (
            <Pressable
              accessibilityLabel={t('corridas.actions.confirmarEmbarque')}
              accessibilityRole="button"
              disabled={isActionLoading}
              onPress={handleConfirmarEmbarque}
              style={[styles.actionButton, styles.actionButtonSuccess, isActionLoading && styles.actionButtonDisabled]}
              testID="btn-confirmar-embarque">
              {isActionLoading ? (
                <ActivityIndicator color={C.textOnDark} size="small" />
              ) : (
                <Text style={styles.actionButtonText}>{t('corridas.actions.confirmarEmbarque')}</Text>
              )}
            </Pressable>
          )}

          {/* PASSAGEIRO_EMBARCADO → Finalizar */}
          {activeCorrida.status === 'PASSAGEIRO_EMBARCADO' && (
            <Pressable
              accessibilityLabel={t('corridas.actions.finalizar')}
              accessibilityRole="button"
              disabled={isActionLoading}
              onPress={handleFinalizar}
              style={[styles.actionButton, styles.actionButtonSuccess, isActionLoading && styles.actionButtonDisabled]}
              testID="btn-finalizar">
              {isActionLoading ? (
                <ActivityIndicator color={C.textOnDark} size="small" />
              ) : (
                <Text style={styles.actionButtonText}>{t('corridas.actions.finalizar')}</Text>
              )}
            </Pressable>
          )}

          {/* Cancel — available in any non-terminal state */}
          {showCancelInput ? (
            <>
              <TextInput
                accessibilityLabel={t('corridas.cancel.motivoPlaceholder')}
                onChangeText={setCancelMotivo}
                placeholder={t('corridas.cancel.motivoPlaceholder')}
                placeholderTextColor={C.textMuted}
                style={styles.cancelInput}
                testID="cancel-motivo-input"
                value={cancelMotivo}
              />
              <Pressable
                accessibilityLabel={t('corridas.cancel.title')}
                accessibilityRole="button"
                disabled={isActionLoading}
                onPress={handleCancelar}
                style={[styles.actionButton, styles.actionButtonDanger, isActionLoading && styles.actionButtonDisabled]}
                testID="btn-cancelar-confirm">
                <Text style={styles.actionButtonText}>{t('corridas.cancel.title')}</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityLabel={t('corridas.cancel.title')}
              accessibilityRole="button"
              onPress={() => setShowCancelInput(true)}
              style={[styles.actionButton, styles.actionButtonDanger]}
              testID="btn-cancelar">
              <Text style={styles.actionButtonText}>{t('corridas.cancel.title')}</Text>
            </Pressable>
          )}
        </Animated.View>
      ) : null}

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
