import React, {useMemo} from 'react';
import {KeyboardAvoidingView, Platform, Pressable, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '../../theme';
import {Avatar, Skeleton, Text} from '@components/atoms';
import {type ChatStackParamList} from '@navigation/types';
import {useChatRoom} from './useChatRoom';
import {MessageList} from './components/MessageList';
import {MessageInput} from './components/MessageInput';
import {TypingIndicator} from './components/TypingIndicator';
import {createChatStyles} from './ChatScreens.styles';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Chat room screen — renders the full conversation thread.
 *
 * Sections:
 * - Custom header: back button, avatar, name, online status, video call icon
 * - MessageList: inverted FlatList with date separators and MessageBubble items
 * - TypingIndicator: animated dots shown when the remote participant is typing
 * - MessageInput: text input with send, attachment, and voice note actions
 *
 * All logic is managed by {@link useChatRoom}.
 * Keyboard avoiding is handled via KeyboardAvoidingView (padding on iOS, height on Android).
 */
export const ChatRoomScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createChatStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const route = useRoute<RouteProp<ChatStackParamList, 'ChatRoom'>>();
  const {conversationId, title} = route.params;

  const {
    listItems,
    isLoading,
    isTyping,
    draftText,
    listRef,
    onChangeText,
    onSend,
    onAttach,
    onVoiceNote,
  } = useChatRoom(conversationId);

  const skeletonAlignEnd = useMemo(
    () => ({justifyContent: 'flex-end' as const}),
    [],
  );
  const skeletonAlignStart = useMemo(
    () => ({justifyContent: 'flex-start' as const}),
    [],
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      {/* Custom header */}
      <View
        style={[styles.chatHeader, {paddingTop: insets.top + theme.spacing.sm}]}
        testID="chat-header">
        <Pressable
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          hitSlop={theme.spacing.md}
          onPress={() => navigation.goBack()}
          style={styles.chatHeaderButton}
          testID="chat-back-button">
          <MaterialIcons
            color={theme.colors.textInverse}
            name="arrow-back"
            size={theme.typography.fontSize.xl}
          />
        </Pressable>

        <Avatar
          name={title}
          size="sm"
          testID="chat-header-avatar"
        />

        <View style={styles.chatHeaderInfo}>
          <Text color="textInverse" numberOfLines={1} variant="label">
            {title}
          </Text>
          <Text color="textInverse" variant="caption">
            {t('chat.online')}
          </Text>
        </View>

        <View style={styles.chatHeaderActions}>
          <Pressable
            accessibilityLabel={t('calls.incomingCall')}
            accessibilityRole="button"
            style={styles.chatHeaderButton}
            testID="chat-video-call-button">
            <MaterialIcons
              color={theme.colors.textInverse}
              name="videocam"
              size={theme.typography.fontSize.xl}
            />
          </Pressable>
        </View>
      </View>

      {/* Message area + input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.flex}>
        {isLoading ? (
          <View style={styles.screenBackground} testID="chat-skeleton">
            {[1, 2, 3, 4].map((i, idx) => (
              <View
                key={i}
                style={[
                  styles.skeletonItem,
                  idx % 2 === 0 ? skeletonAlignEnd : skeletonAlignStart,
                ]}>
                <Skeleton
                  height={theme.spacing['6xl'] - theme.spacing.sm}
                  width={`${40 + (i % 3) * 15}%`}
                />
              </View>
            ))}
          </View>
        ) : (
          <MessageList
            items={listItems}
            listRef={listRef}
            testID="message-list"
          />
        )}

        <TypingIndicator testID="typing-indicator" visible={isTyping} />

        <MessageInput
          onAttach={onAttach}
          onChangeText={onChangeText}
          onSend={onSend}
          onVoiceNote={onVoiceNote}
          testID="message-input"
          value={draftText}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

ChatRoomScreen.displayName = 'ChatRoomScreen';
