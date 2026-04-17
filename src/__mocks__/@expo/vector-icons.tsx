/**
 * @fileoverview Manual mock for @expo/vector-icons.
 * Prevents expo-font / expo-modules-core native EventEmitter from crashing in Jest.
 */
import React from 'react';
import {View} from 'react-native';

const MockIcon = ({testID}: {testID?: string}) => React.createElement(View, {testID});

export const MaterialIcons = MockIcon;
export const Ionicons = MockIcon;
export const FontAwesome = MockIcon;
export const AntDesign = MockIcon;
export const Entypo = MockIcon;
export const EvilIcons = MockIcon;
export const Feather = MockIcon;
export const FontAwesome5 = MockIcon;
export const Foundation = MockIcon;
export const MaterialCommunityIcons = MockIcon;
export const Octicons = MockIcon;
export const SimpleLineIcons = MockIcon;
export const Zocial = MockIcon;

export default MockIcon;
