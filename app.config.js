// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config();

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
    ],
    scheme: 'govmobile',
    extra: {
      apiUrl: process.env.API_URL ?? 'http://172.19.2.116:3000',
      wsUrl: process.env.WS_URL ?? 'ws://172.19.2.116:3000',
      appEnv: process.env.APP_ENV ?? 'development',
      mockMode: process.env.MOCK_MODE === 'true',
    },
  },
};
