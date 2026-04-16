/**
 * @fileoverview User profile screen with editable display name.
 */
import React, {useMemo} from 'react';
import {Pressable, ScrollView, TextInput, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {type NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '../../theme';
import {Avatar, Divider, Text} from '../../components/atoms';
import {AppHeader} from '../../components/organisms';
import {useAppSelector} from '../../store';
import {type ProfileStackParamList} from '../../navigation/types';
import {useProfile} from './useProfile';
import {createProfileStyles} from './ProfileScreens.styles';

const ROLE_COLORS: Record<string, string> = {};

/**
 * Profile screen — shows user info, allows name editing, and provides sign-out.
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
    isSaving,
    toggleEdit,
    saveProfile,
    signOut,
  } = useProfile();

  // Role badge color via theme tokens
  const roleBgColor = useMemo(() => {
    const map: Record<string, string> = {
      ADMIN: theme.colors.error,
      MANAGER: theme.colors.warning,
      OFFICER: theme.colors.info,
      CITIZEN: theme.colors.success,
    };
    return map[user?.role ?? ''] ?? theme.colors.surfaceAlt;
  }, [theme.colors, user?.role]);

  // Suppress unused variable warning — kept for future role-specific color logic
  void ROLE_COLORS;

  return (
    <View style={styles.background}>
      <AppHeader
        title={t('navigation.titles.profile')}
        rightAction={
          isEditing ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void saveProfile()}
              disabled={isSaving}
              testID="profile-save">
              <Text variant="label" color="accent">
                {t('profile.save')}
              </Text>
            </Pressable>
          ) : undefined
        }
        testID="profile-header"
      />

      <ScrollView>
        {/* Avatar + role */}
        <View style={styles.avatarSection}>
          <Avatar name={displayName} size="xl" testID="profile-avatar" />
          <Text variant="heading">{displayName}</Text>
          {user?.email ? (
            <Text variant="caption" color="textMuted">{user.email}</Text>
          ) : null}
          {user?.role ? (
            <View style={[styles.roleBadge, {backgroundColor: roleBgColor}]}>
              <Text variant="caption" color="white">
                {t(`common.role.${user.role}`, {defaultValue: user.role})}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Editable name */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text variant="caption" color="textMuted">{t('profile.fields.name')}</Text>
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
                <Text variant="body">{displayName}</Text>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={toggleEdit}
              style={styles.editButton}
              testID="profile-edit-toggle">
              <MaterialIcons
                color={theme.colors.textMuted}
                name={isEditing ? 'close' : 'edit'}
                size={theme.typography.fontSize.lg}
              />
            </Pressable>
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text variant="caption" color="textMuted">{t('profile.fields.email')}</Text>
              <Text variant="body">{user?.email ?? '—'}</Text>
            </View>
          </View>

          {user?.departmentName ? (
            <View style={[styles.row, styles.rowLast]}>
              <View style={styles.rowLeft}>
                <Text variant="caption" color="textMuted">{t('profile.fields.department')}</Text>
                <Text variant="body">{user.departmentName}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Navigation rows */}
        <View style={styles.section}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Settings')}
            style={styles.row}
            testID="profile-settings-row">
            <Text variant="body">{t('profile.settings')}</Text>
            <MaterialIcons
              color={theme.colors.textMuted}
              name="chevron-right"
              size={theme.typography.fontSize.xl}
            />
          </Pressable>
        </View>

        <Divider />

        {/* Sign out */}
        <View style={styles.section}>
          <Pressable
            accessibilityRole="button"
            onPress={signOut}
            style={[styles.dangerRow]}
            testID="profile-signout">
            <MaterialIcons
              color={theme.colors.error}
              name="logout"
              size={theme.typography.fontSize.lg}
            />
            <Text variant="body" color="error">{t('profile.signOut')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

ProfileScreen.displayName = 'ProfileScreen';
