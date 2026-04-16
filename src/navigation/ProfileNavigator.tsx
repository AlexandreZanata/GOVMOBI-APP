/**
 * @fileoverview Profile stack navigator — Profile and Settings screens.
 *
 * White-flash-on-back fix:
 * When the native stack slides a screen out, it reveals the navigator's
 * container background behind it. We must set that background to match
 * what is actually visible on the screen being revealed (ProfileScreen's
 * light body = surface200 = #F4F6F9).
 *
 * Three-layer defence:
 * 1. `contentStyle` on the Navigator — sets the container background.
 * 2. `backgroundColor` in screenOptions — sets the OS-level window background
 *    for each screen so the system compositor never shows white.
 * 3. Each screen's own SafeAreaView/ScrollView background — already correct.
 */
import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {type ProfileStackParamList} from './types';
import {ProfileScreen} from '../screens/Profile/ProfileScreen';
import {SettingsScreen} from '../screens/Profile/SettingsScreen';
import {designColors} from '../theme';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

/**
 * Profile feature navigator with flash-free back-navigation.
 *
 * @returns The profile stack navigator element.
 */
export const ProfileNavigator = (): React.JSX.Element => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 220,
        // contentStyle fills the container revealed during slide-out.
        // Must match ProfileScreen's scrollContent background (surface200).
        contentStyle: {backgroundColor: designColors.surface200},
      }}>
      <Stack.Screen
        component={ProfileScreen}
        name="Profile"
        options={{
          // The ProfileScreen root SafeAreaView is navy800 (dark header),
          // but the OS window background should be surface200 so the
          // bottom portion never flashes white or dark during transitions.
          contentStyle: {backgroundColor: designColors.surface200},
        }}
      />
      <Stack.Screen
        component={SettingsScreen}
        name="Settings"
        options={{
          contentStyle: {backgroundColor: designColors.surface200},
        }}
      />
    </Stack.Navigator>
  );
};

ProfileNavigator.displayName = 'ProfileNavigator';
