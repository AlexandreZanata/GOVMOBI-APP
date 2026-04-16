/**
 * @fileoverview Redesigned HomeHeader — dark immersive header (Design_Prompt Pattern A).
 *
 * Contains two rows:
 * - Row 1: "GovMobile" title (displayMd, textOnDark) + notification bell
 * - Row 2: Online status dot + label + separator + timestamp
 *
 * The curved bottom radius is applied on the outer container so the
 * surface200 page body shows through the rounded corners.
 */
import React from 'react';
import {Pressable, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '@theme/index';
import {Badge} from '@components/atoms';
import {createHomeStyles} from '../HomeScreen.styles';

export interface HomeHeaderProps {
  /** Department name — shown in the status row after the timestamp. */
  departmentName: string;
  /** Unread notification count for the bell badge. */
  unreadCount: number;
  /** Formatted date/time string shown in the status row. */
  dateTimeLabel: string;
  /** Whether the device has an active network connection. */
  isConnected: boolean;
  /** Called when the notification bell is pressed. */
  onBellPress: () => void;
  testID?: string;
}

/**
 * Dark immersive home header with app title, notification bell, and status row.
 *
 * @param props - {@link HomeHeaderProps}
 * @returns The rendered header section.
 */
export const HomeHeader = ({
  departmentName,
  unreadCount,
  dateTimeLabel,
  isConnected,
  onBellPress,
  testID,
}: HomeHeaderProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createHomeStyles(theme);
  const {design} = theme;

  const statusColor = isConnected ? design.success : design.danger;
  const statusLabel = isConnected ? t('chat.online') : t('chat.offline');

  return (
    <View style={styles.header} testID={testID}>

      {/* ── Row 1: title + bell ── */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{t('common.appName')}</Text>

        <Pressable
          accessibilityLabel={t('common.notifications')}
          accessibilityRole="button"
          onPress={onBellPress}
          style={styles.headerBell}
          testID={`${testID}-bell`}>
          <MaterialIcons
            color={design.textOnDark}
            name="notifications"
            size={24}
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

      {/* ── Row 2: status indicator + timestamp ── */}
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, {backgroundColor: statusColor}]} />
        <Text style={styles.statusLabel}>{statusLabel}</Text>
        <Text style={styles.statusSeparator}>{'·'}</Text>
        <Text style={styles.statusTimestamp}>{dateTimeLabel}</Text>
        {departmentName ? (
          <>
            <Text style={styles.statusSeparator}>{'·'}</Text>
            <Text
              style={styles.statusTimestamp}
              numberOfLines={1}>
              {departmentName}
            </Text>
          </>
        ) : null}
      </View>

    </View>
  );
};

HomeHeader.displayName = 'HomeHeader';
