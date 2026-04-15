import React, {useMemo, useRef} from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useTheme, type Theme} from '../../theme';
import {useTranslation} from 'react-i18next';
import {MessageStatus, MessageType, type Message} from '../../models';
import {Icon, Text} from '../atoms';

export interface MessageBubbleProps {
  message: Message;
  isSentByCurrentUser: boolean;
  timestamp: string;
  style?: StyleProp<ViewStyle>;
  onPress?: (message: Message) => void;
  testID?: string;
}

const getContentByType = (
  message: Message,
  t: (key: string) => string,
): string => {
  if (message.type === MessageType.TEXT) {
    return message.content;
  }

  if (message.type === MessageType.IMAGE) {
    return `${t('chat.imageAttachment')}: ${message.attachmentName ?? ''}`.trim();
  }

  if (message.type === MessageType.FILE) {
    return `${t('chat.fileAttachment')}: ${message.attachmentName ?? ''}`.trim();
  }

  if (message.type === MessageType.AUDIO) {
    return `${t('chat.audioAttachment')}: ${message.attachmentName ?? ''}`.trim();
  }

  return t('chat.systemMessage');
};

const getStatusLabel = (
  status: MessageStatus,
  t: (key: string) => string,
): string => {
  const map: Record<MessageStatus, string> = {
    [MessageStatus.SENDING]: t('chat.sending'),
    [MessageStatus.SENT]: t('chat.sent'),
    [MessageStatus.DELIVERED]: t('chat.delivered'),
    [MessageStatus.READ]: t('chat.read'),
    [MessageStatus.FAILED]: t('chat.failed'),
  };

  return map[status];
};

export const MessageBubble = ({
  message,
  isSentByCurrentUser,
  timestamp,
  style,
  onPress,
  testID,
}: MessageBubbleProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const styles = useMemo(
    () => createStyles(theme, isSentByCurrentUser),
    [theme, isSentByCurrentUser],
  );

  const onPressIn = () => {
    Animated.timing(scale, {
      toValue: 0.98,
      duration: 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 100,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[styles.row, {transform: [{scale}]}, style]}
      testID={testID}>
      <Pressable
        onPress={() => onPress?.(message)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.bubble}
        testID={`${testID}-pressable`}>
        <Text
          color={isSentByCurrentUser ? 'textInverse' : 'text'}
          variant="body">
          {getContentByType(message, t)}
        </Text>
        <View style={styles.metaRow}>
          <Text
            color={isSentByCurrentUser ? 'textInverse' : 'textMuted'}
            style={styles.timestamp}
            variant="caption">
            {timestamp}
          </Text>
          {isSentByCurrentUser ? (
            <View style={styles.statusRow}>
              <Icon
                color={
                  message.status === MessageStatus.FAILED ? 'error' : 'accent'
                }
                name={
                  message.status === MessageStatus.READ ? 'done-all' : 'done'
                }
                size="xs"
              />
              <Text color="textInverse" variant="caption">
                {getStatusLabel(message.status, t)}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
};

MessageBubble.displayName = 'MessageBubble';

const createStyles = (theme: Theme, isSentByCurrentUser: boolean) =>
  StyleSheet.create({
    row: {
      alignItems: isSentByCurrentUser ? 'flex-end' : 'flex-start',
      width: '100%',
    },
    bubble: {
      backgroundColor: isSentByCurrentUser
        ? theme.colors.primary
        : theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      borderWidth: isSentByCurrentUser ? 0 : 1,
      maxWidth: '75%',
      minHeight: theme.spacing['6xl'],
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    metaRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      justifyContent: isSentByCurrentUser ? 'flex-end' : 'flex-start',
      marginTop: theme.spacing.xs,
    },
    timestamp: {
      opacity: 0.9,
    },
    statusRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
  });
