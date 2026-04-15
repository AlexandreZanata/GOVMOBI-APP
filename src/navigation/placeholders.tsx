/**
 * Minimal placeholder screens used by navigators until real screen
 * implementations are built in Steps 9–11.
 * These will be replaced by imports from src/screens/ as each step is completed.
 */
import React from 'react';
import {View} from 'react-native';

const placeholder = (name: string) => {
  const Screen = () => <View testID={`placeholder-${name}`} />;
  Screen.displayName = name;
  return Screen;
};

export const LoginScreen = placeholder('LoginScreen');
export const ForgotPasswordScreen = placeholder('ForgotPasswordScreen');
export const HomeScreen = placeholder('HomeScreen');
export const ConversationListScreen = placeholder('ConversationListScreen');
export const ChatRoomScreen = placeholder('ChatRoomScreen');
export const NewConversationScreen = placeholder('NewConversationScreen');
export const CallHistoryScreen = placeholder('CallHistoryScreen');
export const ActiveCallScreen = placeholder('ActiveCallScreen');
export const IncomingCallScreen = placeholder('IncomingCallScreen');
export const NotificationsScreen = placeholder('NotificationsScreen');
export const ProfileScreen = placeholder('ProfileScreen');
export const SettingsScreen = placeholder('SettingsScreen');
