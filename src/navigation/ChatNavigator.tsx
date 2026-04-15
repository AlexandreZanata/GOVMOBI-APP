import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {type ChatStackParamList} from './types';
import {AppHeader} from './AppHeader';
import {
  ConversationListScreen,
  ChatRoomScreen,
  NewConversationScreen,
} from './placeholders';

const Stack = createNativeStackNavigator<ChatStackParamList>();

/**
 * Chat feature navigator.
 * Manages the conversation list, individual chat rooms, and new conversation flow.
 * All screens use the shared AppHeader with back navigation.
 */
export const ChatNavigator = (): React.JSX.Element => {
  return (
    <Stack.Navigator
      screenOptions={{
        header: ({options}) => (
          <AppHeader
            showBack
            title={typeof options.title === 'string' ? options.title : ''}
          />
        ),
        animation: 'slide_from_right',
        animationDuration: 220,
      }}>
      <Stack.Screen
        component={ConversationListScreen}
        name="ConversationList"
        options={{title: 'Messages'}}
      />
      <Stack.Screen
        component={ChatRoomScreen}
        name="ChatRoom"
        options={({route}) => ({title: route.params.title})}
      />
      <Stack.Screen
        component={NewConversationScreen}
        name="NewConversation"
        options={{title: 'New Message'}}
      />
    </Stack.Navigator>
  );
};

ChatNavigator.displayName = 'ChatNavigator';
