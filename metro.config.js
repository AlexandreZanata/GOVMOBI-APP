const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    alias: {
      '@components': './src/components',
      '@screens': './src/screens',
      '@navigation': './src/navigation',
      '@services': './src/services',
      '@models': './src/models',
      '@store': './src/store',
      '@hooks': './src/hooks',
      '@i18n': './src/i18n',
      '@theme': './src/theme',
      '@utils': './src/utils',
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
