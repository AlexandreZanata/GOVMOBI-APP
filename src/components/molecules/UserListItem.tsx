/**
 * @fileoverview UI component module for UserListItem.
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
import {useTranslation} from '../../i18n/useTranslation';
import {type User} from '../../models';
import {Avatar, Icon, Text} from '../atoms';

export interface UserListItemProps {
  user: User;
  onPress?: (user: User) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Renders a user row with avatar, metadata, and navigation affordance.
 *
 * @param props User entity and interaction handlers.
 * @returns UserListItem component tree.
 */
export const UserListItem = ({
  user,
  onPress,
  style,
  testID,
}: UserListItemProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const styles = useMemo(() => createStyles(theme), [theme]);

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
        onPress={() => onPress?.(user)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.pressable}
        testID={`${testID}-pressable`}>
        <Avatar
          imageUrl={user.avatarUrl}
          isOnline={user.status === 'ACTIVE'}
          name={user.fullName}
          size="md"
          testID={`${testID}-avatar`}
        />
        <View style={styles.content}>
          <Text color="text" variant="label">
            {user.fullName}
          </Text>
          <Text color="textMuted" variant="caption">
            {t(`common.role.${user.role}`)}
          </Text>
          <Text color="textMuted" variant="caption">
            {t(`common.status.${user.status}`)}
          </Text>
        </View>
        <Icon color="textMuted" name="chevron-right" size="md" />
      </Pressable>
    </Animated.View>
  );
};

UserListItem.displayName = 'UserListItem';

/**
 * Creates UserListItem stylesheet values from theme tokens.
 *
 * @param theme Active theme object.
 * @returns React Native stylesheet for UserListItem.
 */
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      width: '100%',
    },
    pressable: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.md,
      minHeight: theme.spacing['6xl'] + theme.spacing['2xl'],
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    content: {
      flex: 1,
      gap: theme.spacing.xs,
    },
  });
