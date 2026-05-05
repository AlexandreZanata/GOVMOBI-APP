/**
 * @fileoverview Location service with timeout + watch fallback and in-flight deduplication.
 */
import type {Coordenada} from '@models/Corrida';

const GET_CURRENT_TIMEOUT_MS = 6000;
const WATCH_FALLBACK_TIMEOUT_MS = 8000;

export interface RefreshLocationResult {
  permissionStatus: 'granted' | 'denied';
  coords: Coordenada | null;
  fromLastKnown: boolean;
  error: string | null;
}

export class LocationService {
  private inFlight: Promise<RefreshLocationResult> | null = null;

  public refreshLocation(): Promise<RefreshLocationResult> {
    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = this.refreshLocationInternal().finally(() => {
      this.inFlight = null;
    });

    return this.inFlight;
  }

  private async refreshLocationInternal(): Promise<RefreshLocationResult> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Location = require('expo-location') as typeof import('expo-location');

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        return {
          permissionStatus: 'denied',
          coords: null,
          fromLastKnown: false,
          error: 'LOCATION_PERMISSION_DENIED',
        };
      }

      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 60_000,
      }).catch(() => null);

      const currentPosition = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch(() => null),
        new Promise<null>(resolve => {
          setTimeout(() => resolve(null), GET_CURRENT_TIMEOUT_MS);
        }),
      ]);

      if (currentPosition) {
        return {
          permissionStatus: 'granted',
          coords: {
            latitude: currentPosition.coords.latitude,
            longitude: currentPosition.coords.longitude,
          },
          fromLastKnown: false,
          error: null,
        };
      }

      const firstWatchFix = await new Promise<import('expo-location').LocationObject | null>(resolve => {
        let resolved = false;
        let sub: {remove: () => void} | null = null;

        const finish = (value: import('expo-location').LocationObject | null): void => {
          if (resolved) return;
          resolved = true;
          sub?.remove();
          resolve(value);
        };

        void Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 5,
          },
          position => {
            finish(position);
          },
        )
          .then(subscription => {
            sub = subscription;
          })
          .catch(() => {
            finish(null);
          });

        setTimeout(() => finish(null), WATCH_FALLBACK_TIMEOUT_MS);
      });

      if (firstWatchFix) {
        return {
          permissionStatus: 'granted',
          coords: {
            latitude: firstWatchFix.coords.latitude,
            longitude: firstWatchFix.coords.longitude,
          },
          fromLastKnown: false,
          error: null,
        };
      }

      if (lastKnown) {
        return {
          permissionStatus: 'granted',
          coords: {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          },
          fromLastKnown: true,
          error: null,
        };
      }

      return {
        permissionStatus: 'granted',
        coords: null,
        fromLastKnown: false,
        error: 'LOCATION_UNAVAILABLE',
      };
    } catch {
      return {
        permissionStatus: 'denied',
        coords: null,
        fromLastKnown: false,
        error: 'LOCATION_MODULE_UNAVAILABLE',
      };
    }
  }
}

export const locationService = new LocationService();

