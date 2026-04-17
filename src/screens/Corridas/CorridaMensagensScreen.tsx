/**
 * @fileoverview CorridaMensagensScreen — full chat screen for an active ride.
 *
 * Pushed from the chat FAB on the PassageiroScreen (Home tab).
 * Loads and displays the message history for the active corrida.
 *
 * GET /corridas/:id/mensagens — message history
 */
/* eslint-disable react-native/no-unused-styles */
import React, {useCallback, useEffect, useMemo} from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Pressable,
  Text,
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
import type {CorridaMensagem} from '@models/Corrida';
import type {PassageiroCorridasStackParamList} from '@navigation/types';
import {StyleSheet} from 'react-native';

type RouteProps = RouteProp<
  PassageiroCorridasStackParamList,
  'CorridaMensagens'
>;

/**
 * Full-screen chat view for a corrida's message history.
 *
 * @returns JSX element for the CorridaMensagensScreen.
 */
export const CorridaMensagensScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const {corridaId} = route.params;

  const shared = useMemo(() => createCorridasStyles(theme), [theme]);
  const styles = useMemo(() => createMensagensStyles(theme), [theme]);

  const {mensagens, isLoadingMensagens, onLoadMensagens} =
    usePassageiroCorrida(corridaId);

  const navigateToHome = useCallback((): void => {
    const parent = navigation.getParent();
    parent?.navigate('PassageiroHome' as never);
  }, [navigation]);

  useEffect(() => {
    void onLoadMensagens(corridaId);
  }, [corridaId, onLoadMensagens]);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          accessibilityLabel={t('passageiro.tabs.home')}
          accessibilityRole="button"
          onPress={navigateToHome}
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
  }, [navigateToHome, navigation, t, theme.design.textOnDark]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        navigateToHome();
        return true;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [navigateToHome]);

  const renderMessage: ListRenderItem<CorridaMensagem> = useCallback(
    ({item}) => {
      const time = new Date(item.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      return (
        <View style={styles.messageRow} testID={`message-${item.id}`}>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{item.conteudo}</Text>
            <Text style={styles.bubbleTime}>{time}</Text>
          </View>
        </View>
      );
    },
    [styles],
  );

  return (
    <View
      style={[styles.root, {paddingBottom: insets.bottom}]}
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
          contentContainerStyle={styles.listContent}
          data={mensagens}
          keyExtractor={item => item.id}
          removeClippedSubviews
          renderItem={renderMessage}
          showsVerticalScrollIndicator={false}
          testID="mensagens-list"
          windowSize={5}
        />
      )}
    </View>
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
    bubble: {
      backgroundColor: design.surface100,
      borderRadius: borderRadius.radius.lg,
      borderBottomLeftRadius: borderRadius.radius.sm,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      maxWidth: '80%',
      ...theme.shadows.card,
    },
    bubbleText: {
      ...typo.scale.bodyMd,
      color: design.textPrimary,
    },
    bubbleTime: {
      ...typo.scale.caption,
      color: design.textTertiary,
      marginTop: spacing[1],
      alignSelf: 'flex-end',
    },
    emptyText: {
      ...typo.scale.bodyMd,
      color: design.textTertiary,
      textAlign: 'center',
    },
  });
};
