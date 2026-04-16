/**
 * @fileoverview Profile stack navigator — Profile and Settings screens.
 */
import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {type ProfileStackParamList} from './types';
import {ProfileScreen} from '../screens/Profile/ProfileScreen';
import {SettingsScreen} from '../screens/Profile/SettingsScreen';
import {colors} from '../theme';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

/**
 * Profile feature navigator.
 *
 * `contentStyle` sets the navigator container background to `colors.light.primary`
 * so the slide-out animation never reveals a white flash behind the screens.
 * This is the correct fix for the white-screen-on-back-navigation issue:
 * the native stack slides the top screen away, revealing the container behind it —
 * without `contentStyle` that container defaults to white (OS default).
 */
export const ProfileNavigator = (): React.JSX.Element => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 220,
        contentStyle: {backgroundColor: colors.light.primary},
      }}>
      <Stack.Screen component={ProfileScreen} name="Profile" />
      <Stack.Screen component={SettingsScreen} name="Settings" />
    </Stack.Navigator>
  );
};

ProfileNavigator.displayName = 'ProfileNavigator';
