import React, {useMemo} from 'react';
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
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.error,
          borderWidth: 1,
          borderColor: theme.colors.background,
        },
        stopText: {
          color: theme.colors.background,
          fontWeight: '700',
          fontSize: 12,
        },
      }),
    [theme],
  );
  const routeLineStyle = useMemo(
    () => ({
      lineColor: theme.colors.primary,
      lineWidth: 4,
      lineOpacity: 0.95,
      lineCap: 'round' as const,
      lineJoin: 'round' as const,
    }),
    [theme],
  );

  if (!MapboxGL) {
    return <View style={styles.wrap} testID={`${testID}-fallback`} />;
  }
  const PointAnnotation = MapboxGL.PointAnnotation;

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

        <PointAnnotation
          coordinate={[corrida.origemLng, corrida.origemLat]}
          id={`${testID}-origem`}>
          <MaterialIcons color={theme.colors.primary} name="trip-origin" size={18} />
        </PointAnnotation>

        {(corrida.pontosParada ?? [])
          .slice()
          .sort((a, b) => a.ordem - b.ordem)
          .map((stop, index) => (
            <PointAnnotation
              coordinate={[stop.lng, stop.lat]}
              id={`${testID}-stop-${stop.id}-${index}`}
              key={`${stop.id}-${index}`}>
              <View style={styles.stopPin}>
                <Text style={styles.stopText}>{String(index + 1)}</Text>
              </View>
            </PointAnnotation>
          ))}

        <PointAnnotation
          coordinate={[corrida.destinoLng, corrida.destinoLat]}
          id={`${testID}-destino`}>
          <MaterialIcons color={theme.colors.success} name="location-on" size={30} />
        </PointAnnotation>

        {driverPosition && (
          <PointAnnotation
            coordinate={[driverPosition.lng, driverPosition.lat]}
            id={`${testID}-driver`}>
            <MaterialIcons color={theme.colors.primary} name="directions-car" size={18} />
          </PointAnnotation>
        )}
      </MapboxGL.MapView>
    </View>
  );
};

