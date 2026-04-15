import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {type CallsStackParamList} from './types';
import {AppHeader} from './AppHeader';
import {
  CallHistoryScreen,
  ActiveCallScreen,
  IncomingCallScreen,
} from './placeholders';

const Stack = createNativeStackNavigator<CallsStackParamList>();

/**
 * Calls feature navigator.
 * CallHistory uses the shared AppHeader.
 * ActiveCall and IncomingCall are full-screen modals with no header
 * (screens own their layout).
 */
export const CallsNavigator = (): React.JSX.Element => {
  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'slide_from_right',
        animationDuration: 220,
      }}>
      <Stack.Screen
        component={CallHistoryScreen}
        name="CallHistory"
        options={{
          header: () => <AppHeader showBack title="Calls" />,
        }}
      />
      <Stack.Screen
        component={ActiveCallScreen}
        name="ActiveCall"
        options={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 200,
        }}
      />
      <Stack.Screen
        component={IncomingCallScreen}
        name="IncomingCall"
        options={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 200,
          presentation: 'fullScreenModal',
        }}
      />
    </Stack.Navigator>
  );
};

CallsNavigator.displayName = 'CallsNavigator';
