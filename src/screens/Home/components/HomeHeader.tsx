import React from 'react';
import {Pressable, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '@theme/index';
import {Badge, Text} from '@components/atoms';
import {createHomeStyles} from '../HomeScreen.styles';

export interface HomeHeaderProps {
  /** Full name of the authenticated user for greeting interpolation. */
  userName: string;
  /** Department name displayed below the greeting. */
  departmentName: string;
  /** Unread notification count shown on the bell badge. */
  unreadCount: number;
  /** Called when the notification bell is pressed. */
  onBellPress: () => void;
  testID?: string;
}

/**
 * Home screen header with user greeting, department label, and notification bell.
 *
 * @param props - {@link HomeHeaderProps}
 * @returns The rendered header section.
 */
export const HomeHeader = ({
  userName,
  departmentName,
  unreadCount,
  onBellPress,
  testID,
}: HomeHeaderProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createHomeStyles(theme);

  return (
    <View style={styles.header} testID={testID}>
      <View style={styles.headerLeft}>
        <Text color="textInverse" variant="heading">
          {t('home.greeting', {name: userName})}
        </Text>
        <Text
          color="textInverse"
          style={styles.headerGreeting}
          variant="caption">
          {departmentName}
        </Text>
      </View>

      <Pressable
        accessibilityLabel={t('common.notifications')}
        accessibilityRole="button"
        onPress={onBellPress}
        style={styles.headerBell}
        testID={`${testID}-bell`}>
        <MaterialIcons
          color={theme.colors.textInverse}
          name="notifications"
          size={theme.typography.fontSize.xl}
        />
        {unreadCount > 0 && (
          <Badge
            size="sm"
            style={styles.headerBadge}
            testID={`${testID}-badge`}
            value={unreadCount > 99 ? '99+' : unreadCount}
            variant="error"
          />
        )}
      </Pressable>
    </View>
  );
};

HomeHeader.displayName = 'HomeHeader';
