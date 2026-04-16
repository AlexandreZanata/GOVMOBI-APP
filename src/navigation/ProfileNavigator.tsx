/**
 * @fileoverview Profile stack navigator — Profile and Settings screens.
 */
import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {type ProfileStackParamList} from './types';
import {ProfileScreen} from '../screens/Profile/ProfileScreen';
import {SettingsScreen} from '../screens/Profile/SettingsScreen';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

/**
 * Profile feature navigator.
 * Screens own their own AppHeader — no shared header here.
 */
export const ProfileNavigator = (): React.JSX.Element => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false, animation: 'slide_from_right'}}>
      <Stack.Screen component={ProfileScreen} name="Profile" />
      <Stack.Screen component={SettingsScreen} name="Settings" />
    </Stack.Navigator>
  );
};

ProfileNavigator.displayName = 'ProfileNavigator';
