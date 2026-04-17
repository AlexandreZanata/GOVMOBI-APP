/**
 * @fileoverview MapboxContainer — lazy-loads @rnmapbox/maps and exposes a
 * typed module reference. Shared by MotoristaScreen and PassageiroScreen.
 *
 * Usage:
 *   import {MapboxGL, type MapboxModule} from '@components/molecules/MapboxContainer';
 */
import type React from 'react';
import {ENV} from '../../config/env';

/** Subset of @rnmapbox/maps used across map screens. */
export type MapboxModule = {
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

/**
 * Lazily-loaded Mapbox GL module. `null` when the native module is unavailable
 * (e.g. Expo Go, unit tests). Consumers must guard with `if (!MapboxGL)`.
 */
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

export {MapboxGL};
