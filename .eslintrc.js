module.exports = {
  root: true,
  extends: [
    '@react-native',
    'prettier',
  ],
  plugins: [
    'react',
    'react-hooks',
    'react-native',
    '@typescript-eslint',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    'react-hooks/exhaustive-deps': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react-native/no-unused-styles': 'error',
    'react-native/split-platform-components': 'error',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'warn',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'prettier/prettier': 'error',
  },
  settings: {
    'import/resolver': {
      typescript: {},
    },
  },
};
