/**
 * @fileoverview Module implementation for navigation/ChatNavigator.
 */
import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {type ChatStackParamList} from './types';
import {AppHeader} from '@components/organisms';
import {ConversationListScreen} from '@screens/Chat/ConversationListScreen';
import {ChatRoomScreen} from '@screens/Chat/ChatRoomScreen';
import {NewConversationScreen} from './placeholders';
import {colors} from '../theme';

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
        contentStyle: {backgroundColor: colors.light.primary},
      }}>
      <Stack.Screen
        component={ConversationListScreen}
        name="ConversationList"
        options={{title: undefined}}
      />
      <Stack.Screen
        component={ChatRoomScreen}
        name="ChatRoom"
        options={({route}) => ({title: route.params.title})}
      />
      <Stack.Screen
        component={NewConversationScreen}
        name="NewConversation"
        options={{title: undefined}}
      />
    </Stack.Navigator>
  );
};

ChatNavigator.displayName = 'ChatNavigator';
