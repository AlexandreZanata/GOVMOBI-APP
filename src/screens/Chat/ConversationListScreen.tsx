import React, {useCallback, useMemo} from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  View,
  type ListRenderItem,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {type NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '../../theme';
import {Avatar, Badge, Skeleton, Text} from '@components/atoms';
import {SearchBar} from '@components/molecules';
import {type ChatStackParamList} from '@navigation/types';
import {useConversationList, type ConversationRow} from './useConversationList';
import {createChatStyles} from './ChatScreens.styles';

// ---------------------------------------------------------------------------
// Item height constant for getItemLayout
// ---------------------------------------------------------------------------

/** Approximate height of a single conversation row. */
const ITEM_HEIGHT = 76;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Conversation list screen — the entry point for the Chat tab.
 *
 * Renders a searchable, swipeable list of conversations with last-message
 * previews and unread count badges. A FAB navigates to NewConversation.
 *
 * All data is managed by {@link useConversationList}.
 */
export const ConversationListScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createChatStyles(theme), [theme]);
  const navigation =
    useNavigation<NativeStackNavigationProp<ChatStackParamList>>();

  const {rows, isLoading, isRefreshing, onSearch, onRefresh, onDelete} =
    useConversationList();

  /**
   * Navigates to the ChatRoom screen for the selected conversation.
   *
   * @param row - The selected ConversationRow.
   */
  const handleRowPress = useCallback(
    (row: ConversationRow): void => {
      navigation.navigate('ChatRoom', {
        conversationId: row.conversation.id,
        title: row.displayName,
      });
    },
    [navigation],
  );

  /**
   * Returns a stable key for each conversation row.
   *
   * @param row - The ConversationRow.
   */
  const keyExtractor = useCallback(
    (row: ConversationRow): string => row.conversation.id,
    [],
  );

  /**
   * Returns the fixed height of each row for layout pre-computation.
   *
   * @param _ - Unused data reference.
   * @param index - Item index.
   */
  const getItemLayout = useCallback(
    (_: ArrayLike<ConversationRow> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  /**
   * Renders a single conversation row with swipe actions.
   *
   * @param param0 - FlatList render item params.
   */
  const renderItem: ListRenderItem<ConversationRow> = useCallback(
    ({item}) => {
      const swipeAnim = new Animated.Value(0);

      const onSwipeLeft = () => {
        Animated.timing(swipeAnim, {
          toValue: -ITEM_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }).start(() => onDelete(item.conversation.id));
      };

      return (
        <Animated.View
          style={{transform: [{translateX: swipeAnim}]}}
          testID={`conversation-row-${item.conversation.id}`}>
          <Pressable
            onLongPress={onSwipeLeft}
            onPress={() => handleRowPress(item)}
            style={styles.conversationItem}>
            <Avatar
              isOnline={item.isOnline}
              name={item.displayName}
              size="md"
              testID={`avatar-${item.conversation.id}`}
            />
            <View style={styles.conversationContent}>
              <View style={styles.conversationTopRow}>
                <Text color="text" numberOfLines={1} variant="label">
                  {item.displayName}
                </Text>
                <Text color="textMuted" variant="caption">
                  {item.lastMessageTime}
                </Text>
              </View>
              <View style={styles.conversationBottomRow}>
                <Text
                  color="textMuted"
                  numberOfLines={1}
                  style={styles.conversationPreview}
                  variant="caption">
                  {item.lastMessagePreview}
                </Text>
                {item.unreadCount > 0 && (
                  <Badge
                    size="sm"
                    testID={`badge-${item.conversation.id}`}
                    value={item.unreadCount > 99 ? '99+' : item.unreadCount}
                    variant="primary"
                  />
                )}
              </View>
            </View>
          </Pressable>
        </Animated.View>
      );
    },
    [handleRowPress, onDelete, styles],
  );

  // Skeleton loader
  if (isLoading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.screenBackground}>
          {[1, 2, 3, 4, 5].map(i => (
            <View key={i} style={styles.skeletonItem}>
              <Skeleton
                borderRadius={999}
                height={theme.spacing['6xl']}
                width={theme.spacing['6xl']}
              />
              <View style={styles.skeletonContent}>
                <Skeleton height={theme.spacing.lg} width="60%" />
                <Skeleton height={theme.spacing.md} width="80%" />
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screenBackground}>
        <FlatList<ConversationRow>
          data={rows}
          getItemLayout={getItemLayout}
          keyExtractor={keyExtractor}
          ListEmptyComponent={
            <View style={styles.emptyState} testID="empty-state">
              <MaterialIcons
                color={theme.colors.textMuted}
                name="chat-bubble-outline"
                size={theme.typography.fontSize['3xl']}
              />
              <Text color="textMuted" variant="body">
                {t('chat.newMessage')}
              </Text>
            </View>
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <SearchBar
                onDebouncedChange={onSearch}
                placeholderKey="common.search"
                testID="conversation-search"
              />
            </View>
          }
          maxToRenderPerBatch={10}
          refreshControl={
            <RefreshControl
              colors={[theme.colors.accent]}
              onRefresh={onRefresh}
              refreshing={isRefreshing}
              tintColor={theme.colors.accent}
            />
          }
          removeClippedSubviews
          renderItem={renderItem}
          stickyHeaderIndices={[0]}
          testID="conversation-list"
          windowSize={5}
        />

        {/* FAB — new conversation */}
        <Pressable
          accessibilityLabel={t('chat.newMessage')}
          accessibilityRole="button"
          onPress={() => navigation.navigate('NewConversation')}
          style={styles.fab}
          testID="fab-new-conversation">
          <MaterialIcons
            color={theme.colors.textInverse}
            name="edit"
            size={theme.typography.fontSize.xl}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

ConversationListScreen.displayName = 'ConversationListScreen';
