/**
 * @fileoverview Babel configuration for the project build pipeline.
 */
module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
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
            '@config': './src/config',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
