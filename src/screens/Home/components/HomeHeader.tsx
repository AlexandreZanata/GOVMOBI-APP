/**
 * @fileoverview Module implementation for screens/Home/components/HomeHeader.
 */
import React from 'react';
import {Pressable, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '@theme/index';
import {Badge, Text} from '@components/atoms';
import {createHomeStyles} from '../HomeScreen.styles';

export interface HomeHeaderProps {
  /** Department name displayed below the app name. */
  departmentName: string;
  /** Unread notification count shown on the bell badge. */
  unreadCount: number;
  /** Called when the notification bell is pressed. */
  onBellPress: () => void;
  testID?: string;
}

/**
 * Home screen header — shows app name, department, and notification bell.
 * The greeting ("Hello, ...") is intentionally omitted for a cleaner dashboard.
 *
 * @param props - {@link HomeHeaderProps}
 * @returns The rendered header section.
 */
export const HomeHeader = ({
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
          {t('common.appName')}
        </Text>
        {departmentName ? (
          <Text
            color="textInverse"
            style={styles.headerGreeting}
            variant="caption">
            {departmentName}
          </Text>
        ) : null}
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
