/**
 * @fileoverview Type definitions for the navigation module.
 */
import {type NavigatorScreenParams} from '@react-navigation/native';

// ---------------------------------------------------------------------------
// Auth Stack
// ---------------------------------------------------------------------------

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
};

// ---------------------------------------------------------------------------
// Chat Stack
// ---------------------------------------------------------------------------

export type ChatStackParamList = {
  ConversationList: undefined;
  ChatRoom: {conversationId: string; title: string};
  NewConversation: undefined;
};

// ---------------------------------------------------------------------------
// Calls Stack
// ---------------------------------------------------------------------------

export type CallsStackParamList = {
  CallHistory: undefined;
  ActiveCall: {callId: string};
  IncomingCall: {callId: string};
};

// ---------------------------------------------------------------------------
// Profile Stack
// ---------------------------------------------------------------------------

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
};

// ---------------------------------------------------------------------------
// Servidores Stack
// ---------------------------------------------------------------------------

export type ServidoresStackParamList = {
  ServidoresList: undefined;
  ServidorDetail: {servidorId: string};
};

// ---------------------------------------------------------------------------
// Frota Stack
// ---------------------------------------------------------------------------

export type FrotaStackParamList = {
  FrotaHome: undefined;
};

// ---------------------------------------------------------------------------
// Main Tab
// ---------------------------------------------------------------------------

export type MainTabParamList = {
  HomeTab: undefined;
  ChatTab: NavigatorScreenParams<ChatStackParamList>;
  CallsTab: NavigatorScreenParams<CallsStackParamList>;
  NotificationsTab: undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

// ---------------------------------------------------------------------------
// Root Stack
// ---------------------------------------------------------------------------

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};
