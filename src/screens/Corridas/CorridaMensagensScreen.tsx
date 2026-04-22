/* eslint-disable react-native/no-unused-styles */
/**
 * @fileoverview CorridaMensagensScreen — full-screen chat for an active ride.
 *
 * Loads message history via GET /corridas/:id/mensagens and appends real-time
 * messages received via the `nova-mensagem` WebSocket event.
 * Allows sending messages via the `enviar-mensagem` WebSocket event.
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {useRoute, type RouteProp} from '@react-navigation/native';
import {useNavigation} from '@react-navigation/native';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '../../theme';
import {usePassageiroCorrida} from './usePassageiroCorrida';
import {createCorridasStyles} from './CorridasScreens.styles';
import {useAppDispatch, useAppSelector} from '../../store';
import {addMensagem} from '@store/slices/corridaSlice';
import {useFacades} from '@services/facades';
import type {CorridaMensagem} from '@models/Corrida';
import type {PassageiroCorridasStackParamList} from '@navigation/types';

type RouteProps = RouteProp<
  PassageiroCorridasStackParamList,
  'CorridaMensagens'
>;

const MAX_MESSAGE_LENGTH = 1000;

/**
 * Full-screen chat view for a corrida's message history.
 * Supports real-time message sending and receiving via WebSocket.
 *
 * @returns JSX element for the CorridaMensagensScreen.
 */
export const CorridaMensagensScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const {realtimeFacade} = useFacades();
  const {corridaId} = route.params;

  const shared = useMemo(() => createCorridasStyles(theme), [theme]);
  const styles = useMemo(() => createMensagensStyles(theme), [theme]);

  const currentUserId = useAppSelector(s => s.auth.user?.id ?? '');
  const mensagens = useAppSelector(s => s.corrida.mensagens);

  const {isLoadingMensagens, onLoadMensagens} = usePassageiroCorrida(corridaId);

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<FlatList<CorridaMensagem>>(null);

  const navigateBack = useCallback((): void => {
    navigation.goBack();
  }, [navigation]);

  // Load message history on mount
  useEffect(() => {
    void onLoadMensagens(corridaId);
  }, [corridaId, onLoadMensagens]);

  // Subscribe to nova-mensagem events and append to Redux
  useEffect(() => {
    const unsubscribe = realtimeFacade.onEvent(event => {
      if (event.type === 'nova-mensagem') {
        const msg = realtimeFacade.normalizeCorridaMensagem({
          id: event.payload.id,
          corridaId: event.payload.corridaId,
          remetenteId: event.payload.remetenteId,
          conteudo: event.payload.conteudo,
          timestamp: event.payload.timestamp,
        });
        dispatch(addMensagem(msg));
      }
    });
    return unsubscribe;
  }, [dispatch, realtimeFacade]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (mensagens.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [mensagens.length]);

  // Header back button
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          onPress={navigateBack}
          testID="mensagens-back-home">
          <MaterialIcons
            color={theme.design.textOnDark}
            name="arrow-back"
            size={22}
          />
        </Pressable>
      ),
      gestureEnabled: false,
    });
  }, [navigateBack, navigation, t, theme.design.textOnDark]);

  // Hardware back button
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        navigateBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [navigateBack]);

  const handleSend = useCallback(async (): Promise<void> => {
    const text = messageText.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setMessageText('');

    await realtimeFacade.sendCorridaMessage({
      corridaId,
      conteudo: text,
    });

    setIsSending(false);
  }, [corridaId, isSending, messageText, realtimeFacade]);

  const renderMessage: ListRenderItem<CorridaMensagem> = useCallback(
    ({item}) => {
      const isOwn = item.remetenteId === currentUserId;
      const time = new Date(item.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      return (
        <View
          style={[styles.messageRow, isOwn && styles.messageRowOwn]}
          testID={`message-${item.id}`}>
          <View style={[styles.bubble, isOwn && styles.bubbleOwn]}>
            <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>
              {item.conteudo}
            </Text>
            <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>
              {time}
            </Text>
          </View>
        </View>
      );
    },
    [currentUserId, styles],
  );

  const bottomPad = insets.bottom > 0 ? insets.bottom : 12;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
      testID="mensagens-screen">
      {/* Message list */}
      {isLoadingMensagens ? (
        <View style={shared.emptyContainer}>
          <ActivityIndicator
            color={theme.colors.primary}
            size="large"
            testID="mensagens-loading"
          />
        </View>
      ) : mensagens.length === 0 ? (
        <View style={shared.emptyContainer} testID="mensagens-empty">
          <Text style={styles.emptyText}>{t('corridas.mensagens.empty')}</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          contentContainerStyle={styles.listContent}
          data={mensagens}
          keyExtractor={item => item.id}
          onContentSizeChange={() => listRef.current?.scrollToEnd({animated: false})}
          removeClippedSubviews
          renderItem={renderMessage}
          showsVerticalScrollIndicator={false}
          testID="mensagens-list"
          windowSize={5}
        />
      )}

      {/* Message input */}
      <View style={[styles.inputRow, {paddingBottom: bottomPad}]}>
        <TextInput
          accessibilityLabel={t('corridas.mensagens.inputPlaceholder')}
          editable={!isSending}
          maxLength={MAX_MESSAGE_LENGTH}
          multiline
          onChangeText={setMessageText}
          placeholder={t('corridas.mensagens.inputPlaceholder')}
          placeholderTextColor={theme.design.textTertiary}
          style={styles.input}
          testID="message-input"
          value={messageText}
        />
        <Pressable
          accessibilityLabel={t('chat.send')}
          accessibilityRole="button"
          disabled={!messageText.trim() || isSending}
          onPress={() => void handleSend()}
          style={[
            styles.sendBtn,
            (!messageText.trim() || isSending) && styles.sendBtnDisabled,
          ]}
          testID="send-btn">
          {isSending ? (
            <ActivityIndicator color={theme.design.textOnDark} size="small" />
          ) : (
            <MaterialIcons color={theme.design.textOnDark} name="send" size={20} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

CorridaMensagensScreen.displayName = 'CorridaMensagensScreen';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createMensagensStyles = (
  theme: Parameters<typeof createCorridasStyles>[0],
) => {
  const {design, spacing, borderRadius, typography: typo} = theme;
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: design.surface200,
    },
    listContent: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[4],
    },
    messageRow: {
      marginBottom: spacing[3],
      alignItems: 'flex-start',
    },
    messageRowOwn: {
      alignItems: 'flex-end',
    },
    bubble: {
      backgroundColor: design.surface100,
      borderRadius: borderRadius.radius.lg,
      borderBottomLeftRadius: borderRadius.radius.sm,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      maxWidth: '80%',
      ...theme.shadows.card,
    },
    bubbleOwn: {
      backgroundColor: design.navy700,
      borderBottomLeftRadius: borderRadius.radius.lg,
      borderBottomRightRadius: borderRadius.radius.sm,
    },
    bubbleText: {
      ...typo.scale.bodyMd,
      color: design.textPrimary,
    },
    bubbleTextOwn: {
      color: design.textOnDark,
    },
    bubbleTime: {
      ...typo.scale.caption,
      color: design.textTertiary,
      marginTop: spacing[1],
      alignSelf: 'flex-end',
    },
    bubbleTimeOwn: {
      color: design.textOnDarkMuted,
    },
    emptyText: {
      ...typo.scale.bodyMd,
      color: design.textTertiary,
      textAlign: 'center',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: spacing[4],
      paddingTop: spacing[3],
      backgroundColor: design.surface100,
      borderTopWidth: 1,
      borderTopColor: design.surface300,
      gap: spacing[3],
    },
    input: {
      flex: 1,
      ...typo.scale.bodyMd,
      color: design.textPrimary,
      backgroundColor: design.surface200,
      borderRadius: borderRadius.radius.lg,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      maxHeight: 100,
    },
    sendBtn: {
      backgroundColor: design.navy700,
      borderRadius: borderRadius.radius.full,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: {
      opacity: 0.4,
    },
  });
};
