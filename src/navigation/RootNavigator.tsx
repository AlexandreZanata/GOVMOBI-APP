/**
 * @fileoverview Module implementation for navigation/RootNavigator.
 */
import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {type RootStackParamList} from './types';
import {AuthNavigator} from './AuthNavigator';
import {MainTabNavigator} from './MainTabNavigator';
import {useAppSelector} from '../store';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root navigator that switches between the Auth and Main flows
 * based on the Redux auth state.
 *
 * Transition: fade between Auth and Main to avoid a jarring slide
 * when the session state changes (per design-pattern-motion-navigation.md).
 */
export const RootNavigator = (): React.JSX.Element => {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: 220,
      }}>
      {isAuthenticated ? (
        <Stack.Screen component={MainTabNavigator} name="Main" />
      ) : (
        <Stack.Screen component={AuthNavigator} name="Auth" />
      )}
    </Stack.Navigator>
  );
};

RootNavigator.displayName = 'RootNavigator';
