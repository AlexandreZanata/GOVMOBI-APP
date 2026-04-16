/**
 * @fileoverview Profile screen — professional user identity card.
 *
 * Layout:
 * - Dark blue hero band (matches brand) with avatar, name, email, role badge
 * - Light card sections below for info rows and actions
 * - Uber/99-style: icon + label + value rows, chevrons on navigable items
 *
 * Tab root — SafeAreaView covers top only; BottomTabBar handles the bottom inset.
 */
import React, {useMemo} from 'react';
import {Pressable, ScrollView, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {type NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '../../theme';
import {Avatar, Text} from '../../components/atoms';
import {useAppSelector} from '../../store';
import {type ProfileStackParamList} from '../../navigation/types';
import {useProfile} from './useProfile';
import {createProfileStyles} from './ProfileScreens.styles';

/**
 * Profile screen with dark hero header and card-based info sections.
 *
 * @returns The profile screen JSX element.
 */
export const ProfileScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createProfileStyles(theme), [theme]);
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();

  const user = useAppSelector(state => state.auth.user);
  const {
    displayName,
    setDisplayName,
    isEditing,
    toggleEdit,
    saveProfile,
    signOut,
  } = useProfile();

  const roleBgColor = useMemo(() => {
    const map: Record<string, string> = {
      ADMIN: theme.colors.error,
      MANAGER: theme.colors.warning,
      OFFICER: theme.colors.info,
      CITIZEN: theme.colors.success,
    };
    return map[user?.role ?? ''] ?? theme.colors.secondary;
  }, [theme.colors, user?.role]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Hero band ── */}
        <View style={styles.hero}>
          <View style={styles.avatarRing}>
            <Avatar name={displayName} size="xl" testID="profile-avatar" />
          </View>

          <Text
            color="textInverse"
            style={styles.heroName}
            variant="heading"
            testID="profile-name">
            {displayName}
          </Text>

          {user?.email ? (
            <Text color="textInverse" style={styles.heroEmail} variant="caption">
              {user.email}
            </Text>
          ) : null}

          {user?.role ? (
            <View style={[styles.roleBadge, {backgroundColor: roleBgColor}]}>
              <Text color="textInverse" variant="caption">
                {t(`common.role.${user.role}`, {defaultValue: user.role})}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Personal info card ── */}
        <View style={styles.section}>
          {/* Name row — editable */}
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <MaterialIcons
                color={theme.colors.textMuted}
                name="person-outline"
                size={theme.typography.fontSize.lg}
              />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel} variant="caption">
                {t('profile.fields.name')}
              </Text>
              {isEditing ? (
                <TextInput
                  accessibilityLabel={t('profile.fields.name')}
                  autoFocus
                  onChangeText={setDisplayName}
                  style={styles.input}
                  testID="profile-name-input"
                  value={displayName}
                />
              ) : (
                <Text style={styles.rowValue} variant="body">
                  {displayName}
                </Text>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={isEditing ? () => void saveProfile() : toggleEdit}
              style={styles.editButton}
              testID="profile-edit-toggle">
              <MaterialIcons
                color={isEditing ? theme.colors.accent : theme.colors.textMuted}
                name={isEditing ? 'check' : 'edit'}
                size={theme.typography.fontSize.lg}
              />
            </Pressable>
          </View>

          {/* Email row */}
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <MaterialIcons
                color={theme.colors.textMuted}
                name="mail-outline"
                size={theme.typography.fontSize.lg}
              />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel} variant="caption">
                {t('profile.fields.email')}
              </Text>
              <Text style={styles.rowValue} variant="body">
                {user?.email ?? '—'}
              </Text>
            </View>
          </View>

          {/* Department row */}
          {user?.departmentName ? (
            <View style={[styles.row, styles.rowLast]}>
              <View style={styles.rowIcon}>
                <MaterialIcons
                  color={theme.colors.textMuted}
                  name="business"
                  size={theme.typography.fontSize.lg}
                />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel} variant="caption">
                  {t('profile.fields.department')}
                </Text>
                <Text style={styles.rowValue} variant="body">
                  {user.departmentName}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* ── App card ── */}
        <View style={styles.section}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Settings')}
            style={[styles.row, styles.rowLast]}
            testID="profile-settings-row">
            <View style={styles.rowIcon}>
              <MaterialIcons
                color={theme.colors.textMuted}
                name="settings"
                size={theme.typography.fontSize.lg}
              />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowValue} variant="body">
                {t('profile.settings')}
              </Text>
            </View>
            <View style={styles.rowChevron}>
              <MaterialIcons
                color={theme.colors.textMuted}
                name="chevron-right"
                size={theme.typography.fontSize.xl}
              />
            </View>
          </Pressable>
        </View>

        {/* ── Sign out card ── */}
        <View style={styles.section}>
          <Pressable
            accessibilityRole="button"
            onPress={signOut}
            style={[styles.dangerRow, styles.rowLast]}
            testID="profile-signout">
            <View style={styles.rowIcon}>
              <MaterialIcons
                color={theme.colors.error}
                name="logout"
                size={theme.typography.fontSize.lg}
              />
            </View>
            <Text color="error" variant="body">
              {t('profile.signOut')}
            </Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

ProfileScreen.displayName = 'ProfileScreen';
