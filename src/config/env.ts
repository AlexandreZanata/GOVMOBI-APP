/**
 * @fileoverview Module implementation for config/env.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Constants = require('expo-constants').default;

/**
 * Typed environment configuration.
 * All values come from app.json `extra` field, which is populated
 * from .env at build time via Expo's config system.
 *
 * Never access process.env directly in app code — use this module.
 */

interface AppConfig {
  /** REST API base URL */
  apiUrl: string;
  /** WebSocket base URL */
  wsUrl: string;
  /** Current environment */
  appEnv: 'development' | 'staging' | 'production';
  /** When true, facades return mock data instead of making real network calls */
  mockMode: boolean;
  /** Uppercase alias used by architecture docs and toggles. */
  MOCK_MODE: boolean;
  /** Mapbox public access token for maps and geocoding */
  MAPBOX_ACCESS_TOKEN: string;
  /** Mapbox secret token for downloads (optional) */
  MAPBOX_SECRET_TOKEN: string;
  /** OneSignal App ID for push notifications */
  ONESIGNAL_APP_ID: string;
}

const extra = Constants.expoConfig?.extra ?? {};

// Fallback URLs used when the bundle was built without a .env file.
// Override these by setting API_URL in your .env before running `expo run:android`.
// In development, log the resolved URL so you can confirm it's correct.
const DEV_API_URL = 'http://172.19.2.116:3000';

export const ENV: AppConfig = {
  apiUrl: (extra.apiUrl as string | undefined) || DEV_API_URL,
  wsUrl: (extra.wsUrl as string | undefined) || DEV_API_URL,
  appEnv: (extra.appEnv as AppConfig['appEnv']) ?? 'development',
  mockMode: extra.mockMode === 'true' || extra.mockMode === true,
  MOCK_MODE: extra.mockMode === 'true' || extra.mockMode === true,
  MAPBOX_ACCESS_TOKEN: (extra.mapboxAccessToken as string | undefined) ?? '',
  MAPBOX_SECRET_TOKEN: (extra.mapboxSecretToken as string | undefined) ?? '',
  ONESIGNAL_APP_ID: (extra.oneSignalAppId as string | undefined) || 'd6247b88-6e87-4695-ac0f-396993ede8ba',
};

// Log resolved API URL in development so you can confirm it's correct on device
if (__DEV__) {
  console.info('[ENV] apiUrl =', ENV.apiUrl);
  console.info('[ENV] wsUrl  =', ENV.wsUrl);
  console.info('[ENV] extra  =', JSON.stringify(extra));
}

export const isDev = ENV.appEnv === 'development';
export const isProduction = ENV.appEnv === 'production';
