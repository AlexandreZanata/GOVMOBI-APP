/**
 * @fileoverview Metro bundler configuration for React Native.
 *
 * Production optimisations:
 * - Inline requires: defers module evaluation until first use, reducing
 *   startup time and effective bundle size on cold launch.
 * - Source maps are excluded from the production bundle (generated separately
 *   via the --sourcemap-output flag during EAS builds).
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable inline requires for faster cold-start and smaller effective bundle.
// Metro evaluates modules lazily — only the modules actually called on startup
// are parsed, which is especially impactful for large dependency trees like
// Mapbox and Reanimated.
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
