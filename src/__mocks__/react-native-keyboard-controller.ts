/**
 * @fileoverview Jest mock for react-native-keyboard-controller.
 *
 * Prevents native module errors in the Jest environment.
 * KeyboardAvoidingView is replaced with a plain View passthrough.
 */
import React from 'react';
import {View} from 'react-native';

export const KeyboardProvider = ({children}: {children: React.ReactNode}) =>
  React.createElement(View, {testID: 'keyboard-provider'}, children);

export const KeyboardAvoidingView = ({
  children,
  style,
  testID,
}: {
  children: React.ReactNode;
  style?: object;
  testID?: string;
}) => React.createElement(View, {style, testID}, children);

export const useKeyboardHandler = () => ({});
export const useReanimatedKeyboardAnimation = () => ({height: {value: 0}, state: {value: 0}});
export const KeyboardEvents = {addListener: () => ({remove: () => {}})};
