/**
 * @fileoverview Redesigned ProfileScreen (Design_Prompt §4 Screen 3).
 *
 * Flash-free transition strategy:
 * The root SafeAreaView uses navy800 — matching the dark hero header — so
 * the OS compositor always sees the correct dark background at the top
 * during the slide-out (back) animation from Settings. The ScrollView
 * carries surface200 for the body area below the hero.
 */
import React, {useMemo} from 'react';
import {Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {type NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '../../theme';
import {useAppSelector} from '../../store';
import {type ProfileStackParamList} from '../../navigation/types';
import {useProfile} from './useProfile';
import {createProfileStyles} from './ProfileScreens.styles';

/** Derives up to 2 uppercase initials from a full name. */
const getInitials = (name: string): string => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

/**
 * Profile screen with dark immersive hero header and card-based info sections.
 *
 * @returns The profile screen JSX element.
 */
export const ProfileScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createProfileStyles(theme), [theme]);
  const {design} = theme;

  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();

  const user = useAppSelector(state => state.auth.user);
  const {displayName, setDisplayName, isEditing, toggleEdit, saveProfile, signOut} =
    useProfile();

  const initials = useMemo(() => getInitials(displayName), [displayName]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea} testID="profile-screen">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}>

        {/* ── Dark hero header ── */}
        <View style={styles.hero} testID="profile-hero">
          <View style={styles.avatarRing}>
            <View style={styles.avatarFallback} testID="profile-avatar">
              <Text style={styles.avatarInitials} accessibilityElementsHidden>
                {initials}
              </Text>
            </View>
          </View>
          <Text style={styles.heroName} testID="profile-name">{displayName}</Text>
          {user?.email ? (
            <Text style={styles.heroEmail} testID="profile-email">{user.email}</Text>
          ) : null}
          {user?.role ? (
            <View style={styles.roleBadge} testID="profile-role-badge">
              <Text style={styles.roleBadgeText}>
                {t(`common.role.${user.role}`, {defaultValue: user.role})}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Info card ── */}
        <View style={styles.section} testID="profile-info-card">
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <MaterialIcons color={design.textTertiary} name="person-outline" size={20} accessibilityElementsHidden />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>{t('profile.fields.name')}</Text>
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
                <Text style={styles.rowValue} testID="profile-name-value">{displayName}</Text>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isEditing ? t('profile.save') : t('profile.edit')}
              onPress={isEditing ? () => void saveProfile() : toggleEdit}
              style={styles.editButton}
              testID="profile-edit-toggle">
              <MaterialIcons
                color={isEditing ? design.amber500 : design.textTertiary}
                name={isEditing ? 'check' : 'edit'}
                size={20}
              />
            </Pressable>
          </View>
          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.rowIcon}>
              <MaterialIcons color={design.textTertiary} name="mail-outline" size={20} accessibilityElementsHidden />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>{t('profile.fields.email')}</Text>
              <Text style={styles.rowValue} testID="profile-email-value">{user?.email ?? '—'}</Text>
            </View>
          </View>
        </View>

        {/* ── Settings card ── */}
        <View style={styles.section} testID="profile-settings-card">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('profile.settings')}
            onPress={() => navigation.navigate('Settings')}
            style={[styles.row, styles.rowLast]}
            testID="profile-settings-row">
            <View style={styles.rowIcon}>
              <MaterialIcons color={design.textTertiary} name="settings" size={20} accessibilityElementsHidden />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowValue}>{t('profile.settings')}</Text>
            </View>
            <View style={styles.rowChevron}>
              <MaterialIcons color={design.textTertiary} name="chevron-right" size={20} />
            </View>
          </Pressable>
        </View>

        {/* ── Sign-out card ── */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profile.signOut')}
          onPress={signOut}
          style={[styles.section, styles.dangerRow, styles.rowLast]}
          testID="profile-signout-card">
          <View style={styles.rowIcon}>
            <MaterialIcons color={design.danger} name="logout" size={20} accessibilityElementsHidden />
          </View>
          <Text style={styles.dangerLabel}>{t('profile.signOut')}</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
};

ProfileScreen.displayName = 'ProfileScreen';
