/* eslint-disable react-native/no-unused-styles */
/**
 * @fileoverview CorridaMensagensScreen — full-screen chat for an active ride.
 *
 * Read-receipt semantics (WhatsApp-style):
 *  - Single grey tick  → message sent (own message, not yet fetched by other party)
 *  - Double grey tick  → message read (lida = true, fetched via GET /mensagens)
 *  - Double blue tick  → message viewed (visualizadaEm set via PATCH or WS)
 *
 * On mount:
 *  1. Loads history via GET /corridas/:id/mensagens (marks received as lida=true)
 *  2. Calls PATCH /corridas/:id/mensagens/visualizar + WS visualizar-mensagens
 *     to mark all received messages as viewed (blue ticks for the sender)
 *  3. Requests unread count via WS contar-nao-visualizadas for badge refresh
 */
import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import {useHeaderHeight} from '@react-navigation/elements';
import {KeyboardAvoidingView} from 'react-native-keyboard-controller';
import {useTranslation} from 'react-i18next';
import {useRoute, useNavigation, type RouteProp} from '@react-navigation/native';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '../../theme';
import {usePassageiroCorrida} from './usePassageiroCorrida';
import {createCorridasStyles} from './CorridasScreens.styles';
import {useAppSelector, useAppDispatch} from '../../store';
import {setChatScreenOpen} from '@store/slices/corridaSlice';
import {useFacades} from '@services/facades';
import type {CorridaMensagem} from '@models/Corrida';
import type {PassageiroCorridasStackParamList} from '@navigation/types';
import type {MotoristaCorridasStackParamList} from '@navigation/types';

type PassageiroRouteProps = RouteProp<PassageiroCorridasStackParamList, 'CorridaMensagens'>;
type MotoristaRouteProps = RouteProp<MotoristaCorridasStackParamList, 'CorridaMensagens'>;

const MAX_MESSAGE_LENGTH = 1000;

// ---------------------------------------------------------------------------
// Tick icon component — renders WhatsApp-style read receipts
// ---------------------------------------------------------------------------

interface TickProps {
  /** True when the message was fetched by the recipient (lida). */
  lida: boolean;
  /** ISO timestamp when the recipient explicitly viewed the message. */
  visualizadaEm: string | null;
  /** Icon size in dp. */
  size?: number;
}

/**
 * Renders a WhatsApp-style read-receipt indicator for own messages.
 *
 * - Single grey check  → sent (not yet fetched)
 * - Double grey check  → delivered/read (lida = true)
 * - Double blue check  → viewed (visualizadaEm set)
 *
 * @param props - {@link TickProps}
 * @returns JSX element or null.
 */
const MessageTick = ({lida, visualizadaEm, size = 14}: TickProps): React.JSX.Element => {
  const theme = useTheme();
  const isViewed = !!visualizadaEm;
  const color = isViewed ? theme.design.blue500 : theme.design.textOnDarkMuted;

  if (!lida) {
    // Single tick — sent but not yet fetched by recipient
    return (
      <MaterialIcons
        color={color}
        name="done"
        size={size}
        testID="tick-sent"
      />
    );
  }

  // Double tick — lida=true (grey) or visualizada (blue)
  return (
    <View style={tickStyles.double} testID={isViewed ? 'tick-viewed' : 'tick-read'}>
      <MaterialIcons color={color} name="done" size={size} style={tickStyles.first} />
      <MaterialIcons color={color} name="done" size={size} />
    </View>
  );
};

const tickStyles = StyleSheet.create({
  double: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  first: {
    marginRight: -6,
  },
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

/**
 * Full-screen chat view for a corrida's message history.
 * Supports real-time message sending/receiving and read receipts.
 *
 * @returns JSX element for the CorridaMensagensScreen.
 */
export const CorridaMensagensScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const route = useRoute<PassageiroRouteProps | MotoristaRouteProps>();
  const navigation = useNavigation();
  const {realtimeFacade, corridaFacade} = useFacades();
  const {corridaId} = route.params;

  const shared = useMemo(() => createCorridasStyles(theme), [theme]);
  const styles = useMemo(() => createMensagensStyles(theme), [theme]);

  const currentUserId = useAppSelector(s => s.auth.servidorId ?? s.auth.user?.id ?? '');
  const mensagens = useAppSelector(s => s.corrida.mensagens);
  const dispatch = useAppDispatch();

  const {isLoadingMensagens, onLoadMensagens} = usePassageiroCorrida(corridaId);

  const headerHeight = useHeaderHeight();


  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<FlatList<CorridaMensagem>>(null);
  const visualizadoRef = useRef(false);

  const navigateBack = useCallback((): void => {
    navigation.goBack();
  }, [navigation]);

  // useLayoutEffect fires synchronously before paint — sets the flag before
  // any WS event can arrive and increment the badge on this render cycle.
  useLayoutEffect(() => {
    dispatch(setChatScreenOpen(true));
    return () => {
      dispatch(setChatScreenOpen(false));
    };
  }, [dispatch]);

  // On mount: load history and mark all received messages as viewed (blue ticks)
  useEffect(() => {
    void onLoadMensagens(corridaId);

    if (!visualizadoRef.current) {
      visualizadoRef.current = true;
      void corridaFacade.visualizarMensagens(corridaId);
      void realtimeFacade.visualizarMensagens({corridaId});
    }
  }, [corridaId, corridaFacade, onLoadMensagens, realtimeFacade]);

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
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      navigateBack();
      return true;
    });
    return () => subscription.remove();
  }, [navigateBack]);

  const handleSend = useCallback(async (): Promise<void> => {
    const text = messageText.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setMessageText('');

    await realtimeFacade.sendCorridaMessage({corridaId, conteudo: text});
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
            <View style={styles.bubbleMeta}>
              <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>
                {time}
              </Text>
              {/* Double-tick only shown on own messages */}
              {isOwn && (
                <View style={styles.tickWrapper}>
                  <MessageTick
                    lida={item.lida}
                    size={13}
                    visualizadaEm={item.visualizadaEm}
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      );
    },
    [currentUserId, styles],
  );

  return (
    <KeyboardAvoidingView
      behavior="translate-with-padding"
      keyboardVerticalOffset={headerHeight}
      style={styles.root}
      testID="mensagens-screen">
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
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({animated: false})}
          removeClippedSubviews
          renderItem={renderMessage}
          showsVerticalScrollIndicator={false}
          testID="mensagens-list"
          windowSize={5}
        />
      )}

      {/* Input bar — flush above keyboard via KeyboardAvoidingView translate-with-padding */}
      <View style={styles.inputRow}>
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
    bubbleMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: spacing[1],
      gap: spacing[1],
    },
    bubbleTime: {
      ...typo.scale.caption,
      color: design.textTertiary,
    },
    bubbleTimeOwn: {
      color: design.textOnDarkMuted,
    },
    tickWrapper: {
      marginLeft: spacing[1],
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
      paddingBottom: spacing[3],
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
