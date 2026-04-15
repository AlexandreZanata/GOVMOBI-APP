import React, {useMemo, useRef} from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useTheme, type Theme} from '../../theme';
import {useTranslation} from 'react-i18next';
import {
  NotificationPriority,
  NotificationType,
  type Notification,
} from '../../models';
import {Icon, Text} from '../atoms';

export interface NotificationItemProps {
  notification: Notification;
  timeLabel: string;
  onPress?: (notification: Notification) => void;
  onDismiss?: (notification: Notification) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const getTypeIcon = (
  type: NotificationType,
): React.ComponentProps<typeof Icon>['name'] => {
  if (type === NotificationType.MESSAGE) {
    return 'chat';
  }
  if (type === NotificationType.CALL) {
    return 'call';
  }
  if (type === NotificationType.ANNOUNCEMENT) {
    return 'campaign';
  }
  if (type === NotificationType.TASK) {
    return 'task';
  }
  return 'notifications';
};

const getPriorityColor = (
  priority: NotificationPriority,
): keyof Theme['colors'] => {
  if (priority === NotificationPriority.CRITICAL) {
    return 'error';
  }
  if (priority === NotificationPriority.HIGH) {
    return 'warning';
  }
  if (priority === NotificationPriority.MEDIUM) {
    return 'info';
  }
  return 'border';
};

const getTypeLabel = (
  type: NotificationType,
  t: (key: string) => string,
): string => {
  if (type === NotificationType.MESSAGE) {
    return t('notificationsList.message');
  }
  if (type === NotificationType.CALL) {
    return t('notificationsList.call');
  }
  if (type === NotificationType.ANNOUNCEMENT) {
    return t('notificationsList.announcement');
  }
  if (type === NotificationType.TASK) {
    return t('notificationsList.task');
  }
  return t('notificationsList.system');
};

export const NotificationItem = ({
  notification,
  timeLabel,
  onPress,
  onDismiss,
  style,
  testID,
}: NotificationItemProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;

  const styles = useMemo(
    () => createStyles(theme, notification),
    [theme, notification],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (
          _: GestureResponderEvent,
          gesture: PanResponderGestureState,
        ) => Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (
          _: GestureResponderEvent,
          gesture: PanResponderGestureState,
        ) => {
          if (gesture.dx < 0) {
            translateX.setValue(gesture.dx);
          }
        },
        onPanResponderRelease: (
          _: GestureResponderEvent,
          gesture: PanResponderGestureState,
        ) => {
          if (gesture.dx < -theme.spacing['6xl']) {
            Animated.timing(translateX, {
              toValue: -theme.spacing['6xl'] - theme.spacing['4xl'],
              duration: 150,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }).start(() => {
              onDismiss?.(notification);
            });
            return;
          }

          Animated.timing(translateX, {
            toValue: 0,
            duration: 150,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        },
      }),
    [notification, onDismiss, theme.spacing, translateX],
  );

  return (
    <View style={[styles.wrapper, style]} testID={testID}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.card, {transform: [{translateX}]}]}>
        <View style={styles.priorityStripe} />

        <Pressable
          onPress={() => onPress?.(notification)}
          style={styles.content}
          testID={`${testID}-pressable`}>
          <Icon
            color="textMuted"
            name={getTypeIcon(notification.type)}
            size="md"
          />
          <View style={styles.textBlock}>
            <View style={styles.titleRow}>
              <Text color="text" variant="label">
                {notification.title}
              </Text>
              <Text color="textMuted" variant="caption">
                {timeLabel}
              </Text>
            </View>
            <Text color="textMuted" variant="body">
              {notification.body}
            </Text>
            <Text color="textMuted" variant="caption">
              {getTypeLabel(notification.type, t)}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
};

NotificationItem.displayName = 'NotificationItem';

const createStyles = (theme: Theme, notification: Notification) =>
  StyleSheet.create({
    wrapper: {
      overflow: 'hidden',
      width: '100%',
    },
    card: {
      backgroundColor: notification.isRead
        ? theme.colors.surfaceAlt
        : theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      flexDirection: 'row',
      minHeight: theme.spacing['6xl'] + theme.spacing['3xl'],
      overflow: 'hidden',
    },
    priorityStripe: {
      backgroundColor: theme.colors[getPriorityColor(notification.priority)],
      width: theme.spacing.xs,
    },
    content: {
      flex: 1,
      flexDirection: 'row',
      gap: theme.spacing.md,
      padding: theme.spacing.md,
    },
    textBlock: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    titleRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  });
