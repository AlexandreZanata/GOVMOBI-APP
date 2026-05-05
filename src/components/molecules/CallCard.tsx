/**
 * @fileoverview UI component module for CallCard.
 */
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
import {CallStatus, CallType, type Call} from '../../models';
import {Avatar, Badge, Icon, Text} from '../atoms';

export interface CallCardProps {
  call: Call;
  displayName: string;
  departmentName?: string;
  avatarUrl?: string;
  onCallBack?: (call: Call) => void;
  onDelete?: (call: Call) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Formats call duration in mm:ss format.
 *
 * @param totalSeconds Total duration in seconds.
 * @returns Formatted duration label, or empty string when unavailable.
 */
const formatDuration = (totalSeconds?: number): string => {
  if (typeof totalSeconds !== 'number') {
    return '';
  }

  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

/**
 * Maps a call status to badge variant semantics.
 *
 * @param status Call status enum value.
 * @returns Badge variant matching the status severity.
 */
const getStatusVariant = (
  status: CallStatus,
): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
  if (status === CallStatus.ACTIVE) {
    return 'success';
  }
  if (status === CallStatus.MISSED) {
    return 'error';
  }
  if (status === CallStatus.INCOMING || status === CallStatus.OUTGOING) {
    return 'primary';
  }
  return 'default';
};

/**
 * Resolves a localized status label for a call.
 *
 * @param status Call status enum value.
 * @param t Translation function.
 * @returns Localized status label.
 */
const getStatusLabel = (
  status: CallStatus,
  t: (key: string) => string,
): string => {
  if (status === CallStatus.INCOMING) {
    return t('calls.incomingCall');
  }
  if (status === CallStatus.OUTGOING) {
    return t('calls.outgoingCall');
  }
  if (status === CallStatus.MISSED) {
    return t('calls.missedCall');
  }
  if (status === CallStatus.ACTIVE) {
    return t('calls.active');
  }
  return t('calls.ended');
};

/**
 * Renders a call summary card with quick callback and delete actions.
 *
 * @param props Call data and interaction handlers.
 * @returns CallCard component tree.
 */
export const CallCard = ({
  call,
  displayName,
  departmentName,
  avatarUrl,
  onCallBack,
  onDelete,
  style,
  testID,
}: CallCardProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const callTypeIcon = call.type === CallType.VIDEO ? 'videocam' : 'call';
  const durationLabel =
    call.status === CallStatus.MISSED
      ? t('calls.missedCall')
      : `${t('calls.duration')}: ${formatDuration(call.duration?.totalSeconds)}`;

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
      style={[styles.container, {transform: [{scale}]}, style]}
      testID={testID}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.infoRow}>
        <Avatar
          imageUrl={avatarUrl}
          name={displayName}
          size="md"
          testID={`${testID}-avatar`}
        />

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text color="text" variant="label">
              {displayName}
            </Text>
            <Icon color="textMuted" name={callTypeIcon} size="md" />
          </View>

          <Text color="textMuted" variant="caption">
            {departmentName ?? t('common.unknownUser')}
          </Text>

          <View style={styles.metaRow}>
            <Badge
              size="sm"
              testID={`${testID}-status`}
              value={getStatusLabel(call.status, t)}
              variant={getStatusVariant(call.status)}
            />
            <Text color="textMuted" variant="caption">
              {durationLabel}
            </Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onCallBack?.(call)}
          style={styles.actionButton}
          testID={`${testID}-callback`}>
          <Icon color="primary" name="call" size="md" />
          <Text color="primary" variant="caption">
            {t('calls.callBack')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => onDelete?.(call)}
          style={styles.actionButton}
          testID={`${testID}-delete`}>
          <Icon color="error" name="delete" size="md" />
          <Text color="error" variant="caption">
            {t('common.delete')}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

CallCard.displayName = 'CallCard';

/**
 * Creates CallCard stylesheet values from theme tokens.
 *
 * @param theme Active theme object.
 * @returns React Native stylesheet for CallCard.
 */
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      padding: theme.spacing.md,
      width: '100%',
    },
    infoRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    content: {
      flex: 1,
      gap: theme.spacing.xs,
      justifyContent: 'center',
    },
    headerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    metaRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    actionRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    actionButton: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.xs,
      minHeight: theme.spacing['6xl'],
      minWidth: theme.spacing['6xl'],
    },
  });
