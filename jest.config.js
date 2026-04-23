module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  testMatch: ['**/__tests__/**/*.(ts|tsx|js)', '**/*.(test|spec).(ts|tsx|js)'],
  // Limit workers to avoid SIGTERM from memory pressure on large test suites
  maxWorkers: 2,
  // Force exit after all tests complete — prevents open handles (timers, sockets) from hanging
  forceExit: true,
  // Per-test timeout — fail fast instead of hanging for 5 minutes
  testTimeout: 15000,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/config/**',
  ],
  coverageThreshold: {
    global: {
      lines: 45,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock',
    '^expo-secure-store$': '<rootDir>/src/__mocks__/expo-secure-store.ts',
    '^@expo/vector-icons$': '<rootDir>/src/__mocks__/@expo/vector-icons.tsx',
    '^@expo/vector-icons/(.*)$':
      '<rootDir>/src/__mocks__/@expo/vector-icons.tsx',
    '^react-native-safe-area-context$':
      '<rootDir>/src/__mocks__/react-native-safe-area-context.tsx',
    '^expo-constants$': '<rootDir>/src/__mocks__/expo-constants.ts',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@navigation/(.*)$': '<rootDir>/src/navigation/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@i18n/(.*)$': '<rootDir>/src/i18n/$1',
    '^@theme/(.*)$': '<rootDir>/src/theme/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-vector-icons|@expo/vector-icons|react-native-safe-area-context|react-native-screens|react-native-gesture-handler|@reduxjs/toolkit|immer|react-redux|@react-navigation|expo-status-bar|expo-secure-store|expo-location|expo-modules-core|expo-constants|expo-font|expo-asset|expo-file-system|@rnmapbox)/)',
  ],
};
