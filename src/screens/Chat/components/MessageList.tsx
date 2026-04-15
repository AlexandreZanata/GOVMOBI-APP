import React, {useCallback, useMemo} from 'react';
import {
  FlatList,
  View,
  type FlatListProps,
  type ListRenderItem,
} from 'react-native';
import {useTheme} from '@theme/index';
import {Text} from '@components/atoms';
import {MessageBubble} from '@components/molecules';
import {useAppSelector} from '@store/index';
import {type MessageListItem} from '../useChatRoom';
import {formatTimeLabel} from '../useChatRoom';
import {createChatStyles} from '../ChatScreens.styles';

// ---------------------------------------------------------------------------
// Item height constants for getItemLayout
// ---------------------------------------------------------------------------

/** Approximate height of a single-line text message bubble + gap. */
const MSG_HEIGHT_BASE = 72;
/** Approximate height of a date separator row. */
const SEPARATOR_HEIGHT = 40;
/** Vertical gap between items. */
const ITEM_GAP = 8;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MessageListProps
  extends Omit<
    FlatListProps<MessageListItem>,
    | 'data'
    | 'renderItem'
    | 'keyExtractor'
    | 'getItemLayout'
    | 'inverted'
    | 'windowSize'
    | 'maxToRenderPerBatch'
    | 'removeClippedSubviews'
    | 'ref'
  > {
  /** Ordered list items (newest first for inverted rendering). */
  items: MessageListItem[];
  /** Ref forwarded from the parent for programmatic scroll control. */
  listRef: React.RefObject<FlatList<MessageListItem> | null>;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Optimised inverted FlatList for chat messages.
 *
 * Renders {@link MessageBubble} for message items and date separator pills
 * for separator items. Configured for 60FPS performance with:
 * - `inverted` — newest message at the bottom
 * - `windowSize={5}` — limits off-screen render budget
 * - `maxToRenderPerBatch={10}` — controls batch render size
 * - `removeClippedSubviews` — unmounts off-screen items on Android
 * - `getItemLayout` — skips dynamic measurement for known heights
 *
 * @param props - {@link MessageListProps}
 * @returns The rendered message FlatList.
 */
export const MessageList = ({
  items,
  listRef,
  testID,
  ...rest
}: MessageListProps): React.JSX.Element => {
  const theme = useTheme();
  const styles = useMemo(() => createChatStyles(theme), [theme]);
  const currentUserId = useAppSelector(state => state.auth.user?.id ?? '');

  /**
   * Returns a stable key for each list item.
   *
   * @param item - The MessageListItem.
   * @returns Unique string key.
   */
  const keyExtractor = useCallback(
    (item: MessageListItem): string =>
      item.kind === 'message' ? item.data.id : item.id,
    [],
  );

  /**
   * Returns the approximate height of each item for layout pre-computation.
   * Avoids dynamic measurement, enabling instant scroll-to-index.
   *
   * @param _ - Unused data array reference.
   * @param index - Item index.
   * @returns Layout descriptor with length, offset, and index.
   */
  const getItemLayout = useCallback(
    (
      _: ArrayLike<MessageListItem> | null | undefined,
      index: number,
    ): {length: number; offset: number; index: number} => {
      const height =
        items[index]?.kind === 'separator'
          ? SEPARATOR_HEIGHT
          : MSG_HEIGHT_BASE;
      const offset = items
        .slice(0, index)
        .reduce(
          (acc, item) =>
            acc +
            (item.kind === 'separator' ? SEPARATOR_HEIGHT : MSG_HEIGHT_BASE) +
            ITEM_GAP,
          0,
        );
      return {length: height, offset, index};
    },
    [items],
  );

  /**
   * Renders a single list item — either a MessageBubble or a date separator.
   *
   * @param param0 - FlatList render item params.
   * @returns The rendered item element.
   */
  const renderItem: ListRenderItem<MessageListItem> = useCallback(
    ({item, index}) => {
      if (item.kind === 'separator') {
        return (
          <View style={styles.messageSeparator} testID={`separator-${item.id}`}>
            <View style={styles.separatorPill}>
              <Text color="textMuted" variant="caption">
                {item.date}
              </Text>
            </View>
          </View>
        );
      }

      const isSentByCurrentUser = item.data.senderId === currentUserId;
      return (
        <MessageBubble
          isSentByCurrentUser={isSentByCurrentUser}
          message={item.data}
          testID={`message-${index}`}
          timestamp={formatTimeLabel(item.data.createdAt)}
        />
      );
    },
    [currentUserId, styles],
  );

  return (
    <FlatList<MessageListItem>
      {...rest}
      contentContainerStyle={styles.messageListContent}
      data={items}
      getItemLayout={getItemLayout}
      inverted
      ItemSeparatorComponent={() => <View style={{height: ITEM_GAP}} />}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      keyExtractor={keyExtractor}
      maxToRenderPerBatch={10}
      ref={listRef}
      removeClippedSubviews
      renderItem={renderItem}
      testID={testID}
      windowSize={5}
    />
  );
};

MessageList.displayName = 'MessageList';
