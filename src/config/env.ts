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
}

const extra = Constants.expoConfig?.extra ?? {};

export const ENV: AppConfig = {
  apiUrl: extra.apiUrl ?? 'https://api.govmobile.dev',
  wsUrl: extra.wsUrl ?? 'wss://ws.govmobile.dev',
  appEnv: extra.appEnv ?? 'development',
  mockMode: extra.mockMode === 'true' || extra.mockMode === true,
  MOCK_MODE: extra.mockMode === 'true' || extra.mockMode === true,
};

export const isDev = ENV.appEnv === 'development';
export const isProduction = ENV.appEnv === 'production';
