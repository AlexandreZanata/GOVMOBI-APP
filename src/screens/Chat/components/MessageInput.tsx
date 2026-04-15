import React, {useCallback, useMemo, useRef} from 'react';
import {
  Animated,
  Easing,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '../../../theme';
import {createChatStyles} from '../ChatScreens.styles';

export interface MessageInputProps {
  /** Current draft text value. */
  value: string;
  /** Called on every keystroke. */
  onChangeText: (text: string) => void;
  /** Called when the send button is pressed. */
  onSend: () => void;
  /** Called when the attachment button is pressed. */
  onAttach: () => void;
  /** Called when the voice note button is pressed. */
  onVoiceNote: () => void;
  testID?: string;
}

/**
 * Chat message input bar with send, attachment, and voice note actions.
 *
 * The send button animates in when the user has typed text and animates out
 * when the input is empty, replaced by the voice note button.
 * All icons use the theme color palette.
 *
 * @param props - {@link MessageInputProps}
 * @returns The rendered input bar.
 */
export const MessageInput = ({
  value,
  onChangeText,
  onSend,
  onAttach,
  onVoiceNote,
  testID,
}: MessageInputProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createChatStyles(theme), [theme]);

  const sendScale = useRef(new Animated.Value(value.trim() ? 1 : 0)).current;
  const hasText = value.trim().length > 0;

  // Animate send button in/out as text changes
  const prevHasText = useRef(hasText);
  if (prevHasText.current !== hasText) {
    prevHasText.current = hasText;
    Animated.timing(sendScale, {
      toValue: hasText ? 1 : 0,
      duration: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  /**
   * Handles the send button press with a brief scale animation.
   */
  const handleSend = useCallback((): void => {
    Animated.sequence([
      Animated.timing(sendScale, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(sendScale, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start(() => onSend());
  }, [onSend, sendScale]);

  return (
    <View style={styles.inputBar} testID={testID}>
      {/* Attachment button */}
      <Pressable
        accessibilityLabel={t('chat.attach')}
        accessibilityRole="button"
        onPress={onAttach}
        style={styles.inputActionButton}
        testID={`${testID}-attach`}>
        <MaterialIcons
          color={theme.colors.textMuted}
          name="attach-file"
          size={theme.typography.fontSize.xl}
        />
      </Pressable>

      {/* Text input */}
      <TextInput
        accessibilityLabel={t('chat.newMessage')}
        multiline
        onChangeText={onChangeText}
        placeholder={t('chat.newMessage')}
        placeholderTextColor={theme.colors.textMuted}
        style={styles.inputField}
        testID={`${testID}-text-input`}
        value={value}
      />

      {/* Send / Voice note toggle */}
      {hasText ? (
        <Animated.View style={{transform: [{scale: sendScale}]}}>
          <Pressable
            accessibilityLabel={t('chat.send')}
            accessibilityRole="button"
            onPress={handleSend}
            style={styles.sendButton}
            testID={`${testID}-send`}>
            <MaterialIcons
              color={theme.colors.textInverse}
              name="send"
              size={theme.typography.fontSize.lg}
            />
          </Pressable>
        </Animated.View>
      ) : (
        <Pressable
          accessibilityLabel={t('chat.audioAttachment')}
          accessibilityRole="button"
          onPress={onVoiceNote}
          style={styles.inputActionButton}
          testID={`${testID}-voice`}>
          <MaterialIcons
            color={theme.colors.textMuted}
            name="mic"
            size={theme.typography.fontSize.xl}
          />
        </Pressable>
      )}
    </View>
  );
};

MessageInput.displayName = 'MessageInput';
