import {StyleSheet} from 'react-native';
import {type Theme} from '../../theme';

/**
 * Creates the shared StyleSheet for Chat screens and subcomponents.
 * All values come from theme tokens — no hardcoded colors or sizes.
 *
 * @param theme - The current GovMobile theme object.
 * @returns A StyleSheet object scoped to the Chat screens.
 */
// eslint-disable-next-line react-native/no-unused-styles
export const createChatStyles = (theme: Theme) =>
  StyleSheet.create({
    // ---- Root ----
    flex: {
      flex: 1,
    },
    safeArea: {
      backgroundColor: theme.colors.primary,
      flex: 1,
    },
    screenBackground: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },

    // ---- ConversationList ----
    listHeader: {
      backgroundColor: theme.colors.background,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
    },
    conversationItem: {
      backgroundColor: theme.colors.surface,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    conversationContent: {
      flex: 1,
      gap: theme.spacing.xs,
      justifyContent: 'center',
    },
    conversationTopRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    conversationBottomRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    conversationPreview: {
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    swipeAction: {
      alignItems: 'center',
      justifyContent: 'center',
      width: theme.spacing['6xl'],
    },
    swipeArchive: {
      backgroundColor: theme.colors.info,
    },
    swipeDelete: {
      backgroundColor: theme.colors.error,
    },
    fab: {
      alignItems: 'center',
      backgroundColor: theme.colors.accent,
      borderRadius: theme.borderRadius.pill,
      bottom: theme.spacing['2xl'],
      elevation: 6,
      height: theme.spacing['6xl'] - theme.spacing.sm,
      justifyContent: 'center',
      position: 'absolute',
      right: theme.spacing.lg,
      shadowColor: theme.colors.black,
      shadowOffset: {width: 0, height: 3},
      shadowOpacity: 0.2,
      shadowRadius: 6,
      width: theme.spacing['6xl'] - theme.spacing.sm,
    },
    emptyState: {
      alignItems: 'center',
      flex: 1,
      gap: theme.spacing.md,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing['3xl'],
    },

    // ---- ChatRoom header ----
    chatHeader: {
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      flexDirection: 'row',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    chatHeaderInfo: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    chatHeaderActions: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    chatHeaderButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      minWidth: 44,
    },

    // ---- MessageList ----
    messageListContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    messageSeparator: {
      alignItems: 'center',
      marginVertical: theme.spacing.md,
    },
    separatorPill: {
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.borderRadius.pill,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },

    // ---- Typing indicator ----
    typingContainer: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    typingDot: {
      backgroundColor: theme.colors.textMuted,
      borderRadius: theme.borderRadius.pill,
      height: theme.spacing.sm,
      width: theme.spacing.sm,
    },

    // ---- MessageInput ----
    inputBar: {
      alignItems: 'flex-end',
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    inputField: {
      backgroundColor: theme.colors.surfaceAlt,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.pill,
      borderWidth: 1,
      color: theme.colors.text,
      flex: 1,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.md,
      maxHeight: theme.spacing['6xl'] + theme.spacing['4xl'],
      minHeight: theme.spacing['6xl'] - theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    inputActionButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      minWidth: 44,
    },
    sendButton: {
      alignItems: 'center',
      backgroundColor: theme.colors.accent,
      borderRadius: theme.borderRadius.pill,
      height: theme.spacing['6xl'] - theme.spacing.sm,
      justifyContent: 'center',
      width: theme.spacing['6xl'] - theme.spacing.sm,
    },
    sendButtonDisabled: {
      backgroundColor: theme.colors.border,
    },

    // ---- Skeleton ----
    skeletonItem: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    skeletonContent: {
      flex: 1,
      gap: theme.spacing.sm,
    },
  });
