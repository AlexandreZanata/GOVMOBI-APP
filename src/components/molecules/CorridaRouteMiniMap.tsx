import React, {useCallback, useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {MapboxGL} from '@components/molecules/MapboxContainer';
import {useTheme} from '@theme/index';
import type {Corrida} from '@models/Corrida';

interface CorridaRouteMiniMapProps {
  corrida: Corrida;
  /** Road geometry from `/pesquisa/rota` (merged legs). When omitted, draws a straight path through stops. */
  routePolyline?: [number, number][] | null;
  driverPosition?: {lat: number; lng: number} | null;
  testID?: string;
}

export const CorridaRouteMiniMap = ({
  corrida,
  routePolyline,
  driverPosition,
  testID = 'corrida-route-map',
}: CorridaRouteMiniMapProps): React.JSX.Element => {
  const theme = useTheme();
  const straightPoints = useMemo(() => {
    const stops = (corrida.pontosParada ?? [])
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map(stop => [stop.lng, stop.lat] as [number, number]);
    return [
      [corrida.origemLng, corrida.origemLat] as [number, number],
      ...stops,
      [corrida.destinoLng, corrida.destinoLat] as [number, number],
    ];
  }, [corrida]);

  const routeCoordinates = useMemo(
    () =>
      routePolyline && routePolyline.length >= 2 ? routePolyline : straightPoints,
    [routePolyline, straightPoints],
  );

  const routeFeature = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {type: 'LineString' as const, coordinates: routeCoordinates},
    }),
    [routeCoordinates],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          height: 180,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: theme.design.surface300,
        },
        map: {flex: 1},
        stopPin: {
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.design.danger,
          borderWidth: 2,
          borderColor: theme.colors.surface,
          shadowColor: theme.design.navy900,
          shadowOffset: {width: 0, height: 1},
          shadowOpacity: 0.2,
          shadowRadius: 2,
          elevation: 2,
        },
        stopText: {
          color: theme.colors.surface,
          fontWeight: '800',
          fontSize: 13,
        },
      }),
    [theme],
  );
  const routeLineStyle = useMemo(
    () => ({
      lineColor: theme.design.blue500,
      lineWidth: 4,
      lineOpacity: 0.95,
      lineCap: 'round' as const,
      lineJoin: 'round' as const,
    }),
    [theme],
  );

  const renderMapPin = useCallback(
    (
      pinId: string,
      coordinate: [number, number],
      title: string | undefined,
      pinContent: React.ReactNode,
    ): React.ReactNode => {
      if (!MapboxGL) return null;
      const M = MapboxGL;
      const content = <View collapsable={false}>{pinContent}</View>;
      if (M.MarkerView) {
        return (
          <M.MarkerView
            key={pinId}
            allowOverlap
            anchor={{x: 0.5, y: 1}}
            coordinate={coordinate}>
            {content}
          </M.MarkerView>
        );
      }
      return (
        <M.PointAnnotation key={pinId} coordinate={coordinate} id={pinId} title={title}>
          {pinContent}
        </M.PointAnnotation>
      );
    },
    [],
  );

  if (!MapboxGL) {
    return <View style={styles.wrap} testID={`${testID}-fallback`} />;
  }

  return (
    <View style={styles.wrap} testID={testID}>
      <MapboxGL.MapView
        attributionEnabled={false}
        logoEnabled={false}
        scaleBarEnabled={false}
        style={styles.map}
        styleURL="mapbox://styles/mapbox/light-v11">
        <MapboxGL.Camera
          centerCoordinate={[corrida.origemLng, corrida.origemLat]}
          zoomLevel={13}
        />
        <MapboxGL.ShapeSource id={`${testID}-route-src`} shape={routeFeature}>
          <MapboxGL.LineLayer id={`${testID}-route-line`} style={routeLineStyle} />
        </MapboxGL.ShapeSource>

        {renderMapPin(
          `${testID}-origem`,
          [corrida.origemLng, corrida.origemLat],
          undefined,
          <MaterialIcons color={theme.design.success} name="person-pin" size={22} />,
        )}

        {renderMapPin(
          `${testID}-destino`,
          [corrida.destinoLng, corrida.destinoLat],
          undefined,
          <MaterialIcons color={theme.design.danger} name="location-on" size={26} />,
        )}

        {(corrida.pontosParada ?? [])
          .slice()
          .sort((a, b) => a.ordem - b.ordem)
          .map((stop, index) =>
            renderMapPin(
              `${testID}-stop-${stop.id}-${index}`,
              [stop.lng, stop.lat],
              undefined,
              <View style={styles.stopPin}>
                <Text style={styles.stopText}>{String(index + 1)}</Text>
              </View>,
            ),
          )}

        {driverPosition &&
          renderMapPin(
            `${testID}-driver`,
            [driverPosition.lng, driverPosition.lat],
            undefined,
            <MaterialIcons color={theme.colors.primary} name="directions-car" size={20} />,
          )}
      </MapboxGL.MapView>
    </View>
  );
};

