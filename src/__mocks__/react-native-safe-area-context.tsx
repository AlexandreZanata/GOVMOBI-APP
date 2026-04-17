/**
 * @fileoverview Manual mock for react-native-safe-area-context.
 * Provides zero insets so screens render without a native SafeAreaProvider.
 */
import React from 'react';

const insets = {top: 0, bottom: 0, left: 0, right: 0};

export const useSafeAreaInsets = () => insets;
export const SafeAreaProvider = ({children}: {children: React.ReactNode}) =>
  React.createElement(React.Fragment, null, children);
export const SafeAreaView = ({children}: {children: React.ReactNode}) =>
  React.createElement(React.Fragment, null, children);
export const SafeAreaConsumer = ({
  children,
}: {
  children: (insets: typeof insets) => React.ReactNode;
}) => React.createElement(React.Fragment, null, children(insets));
export const SafeAreaInsetsContext = React.createContext(insets);
export const initialWindowMetrics = {
  frame: {x: 0, y: 0, width: 390, height: 844},
  insets,
};
