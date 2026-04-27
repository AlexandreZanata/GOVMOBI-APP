// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config();

// @rnmapbox/maps reads RNMAPBOX_MAPS_DOWNLOAD_TOKEN from the environment.
// We set it here from .env so the plugin picks it up without any config option.
if (process.env.MAPBOX_SECRET_TOKEN) {
  process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN = process.env.MAPBOX_SECRET_TOKEN;
}

const MAPBOX_SECRET_TOKEN = process.env.MAPBOX_SECRET_TOKEN ?? '';
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN ?? '';

/**
 * Dynamic Expo config — reads environment variables from .env at build time.
 * Use `app.json` values as fallbacks for CI environments that inject vars directly.
 *
 * @type {import('expo/config').ExpoConfig}
 */
module.exports = {
  expo: {
    name: 'GovMobile',
    slug: 'govmobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#0A1628',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'gov.govmobile.app',
      infoPlist: {
        // Required for OneSignal background push delivery on iOS.
        UIBackgroundModes: ['remote-notification'],
      },
      entitlements: {
        // Must match the build type: 'development' for dev builds, 'production' for store.
        'aps-environment': process.env.APP_ENV === 'production' ? 'production' : 'development',
        'com.apple.security.application-groups': [
          'group.gov.govmobile.app.onesignal',
        ],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0A1628',
      },
      package: 'gov.govmobile.app',
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      'expo-splash-screen',
      'expo-secure-store',
      'expo-file-system',
      'expo-image-picker',
      'expo-av',
      'expo-font',
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'GovMobile needs your location to show your position on the map.',
        },
      ],
      [
        '@rnmapbox/maps',
        {
          // RNMAPBOX_MAPS_DOWNLOAD_TOKEN is set from MAPBOX_SECRET_TOKEN above.
          // No RNMapboxMapsVersion override — let @rnmapbox/maps@10.3.0 use its
          // own default (11.18.2), which ships android-ndk27 artifacts.
        },
      ],
      [
        'onesignal-expo-plugin',
        {
          mode: process.env.APP_ENV === 'production' ? 'production' : 'development',
          // Android notification icon (white, transparent, 96×96px).
          // Shown in the status bar and notification drawer.
          smallIcons: ['./assets/ic_stat_notification.png'],
          // Accent color for the Android notification icon.
          smallIconAccentColor: '#1A56DB',
        },
      ],
    ],
    scheme: 'govmobile',
    extra: {
      apiUrl: process.env.API_URL,
      wsUrl: process.env.WS_URL,
      appEnv: process.env.APP_ENV ?? 'development',
      mockMode: process.env.MOCK_MODE === 'true',
      mapboxAccessToken: MAPBOX_ACCESS_TOKEN,
      mapboxSecretToken: MAPBOX_SECRET_TOKEN,
      oneSignalAppId: process.env.ONESIGNAL_APP_ID ?? '',
    },
  },
};
