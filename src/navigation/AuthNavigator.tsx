import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {type AuthStackParamList} from './types';
import {
  LoginScreen,
  ForgotPasswordScreen,
} from './placeholders';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Authentication flow navigator.
 * Renders Login and ForgotPassword screens with no visible header
 * (screens own their own header layout).
 */
export const AuthNavigator = (): React.JSX.Element => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 220,
      }}>
      <Stack.Screen component={LoginScreen} name="Login" />
      <Stack.Screen component={ForgotPasswordScreen} name="ForgotPassword" />
    </Stack.Navigator>
  );
};

AuthNavigator.displayName = 'AuthNavigator';
