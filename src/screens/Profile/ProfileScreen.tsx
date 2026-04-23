/**
 * @fileoverview Redesigned ProfileScreen (Design_Prompt §4 Screen 3).
 *
 * Role-aware sections:
 * - MOTORISTA: inline star-rating card fetched from GET /motoristas/minha-nota.
 *   No navigation to a separate page — the rating lives here.
 * - All roles: collapsible change-password card (closed by default).
 *   Feedback is shown inline — no global toast banners.
 */
import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {type NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '../../theme';
import {useAppSelector} from '../../store';
import {type ProfileStackParamList} from '@navigation/types';
import {useProfile} from './useProfile';
import {createProfileStyles} from './ProfileScreens.styles';
import {useMinhaAvaliacaoSummary} from '@screens/Motorista/useMinhaAvaliacaoSummary';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derives up to 2 uppercase initials from a full name. */
const getInitials = (name: string): string => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

/**
 * Renders 5 star icons (filled / half / empty) for a given numeric rating.
 * Uses MaterialIcons: star, star-half, star-border.
 *
 * @param rating - Numeric value in [0, 5].
 * @param color  - Icon colour token string.
 */
const StarRow = ({rating, color}: {rating: number; color: string}): React.JSX.Element => {
  const stars = Array.from({length: 5}, (_, i) => {
    const full = i + 1;
    if (rating >= full) return 'star' as const;
    if (rating >= full - 0.5) return 'star-half' as const;
    return 'star-border' as const;
  });
  return (
    <>
      {stars.map((name, i) => (
        <MaterialIcons key={i} name={name} size={23} color={color} />
      ))}
    </>
  );
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

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
  const motoristaId = useAppSelector(state => state.auth.motoristaId);

  const {
    displayName,
    setDisplayName,
    isEditing,
    toggleEdit,
    saveProfile,
    signOut,
    senhaAntiga,
    setSenhaAntiga,
    novaSenha,
    setNovaSenha,
    confirmarSenha,
    setConfirmarSenha,
    isChangingPassword,
    passwordFeedback,
    changePassword,
  } = useProfile();

  // Rating — only fetched when the user is a driver.
  const {summary: ratingSummary, isLoading: ratingLoading} =
    useMinhaAvaliacaoSummary();

  const initials = useMemo(() => getInitials(displayName), [displayName]);

  /** Controls whether the change-password inputs are expanded. */
  const [pwdOpen, setPwdOpen] = useState(false);

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
          {user?.role || motoristaId ? (
            <View style={styles.roleBadge} testID="profile-role-badge">
              <Text style={styles.roleBadgeText}>
                {motoristaId
                  ? t('servidores.papeis.MOTORISTA')
                  : t(`common.role.${user!.role}`, {defaultValue: user!.role})}
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
                color={isEditing ? design.blue500 : design.textTertiary}
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

        {/* ── Minha Nota — inline star card, MOTORISTA only ── */}
        {motoristaId ? (
          <View style={styles.section} testID="profile-minha-nota-card">
            <View style={styles.ratingCard} testID="profile-minha-nota-row">

              {ratingLoading ? (
                <ActivityIndicator
                  color={design.amber500}
                  size="small"
                  testID="rating-loading"
                />
              ) : ratingSummary && ratingSummary.totalAvaliacoes > 0 ? (
                <View style={styles.ratingStarsRow} testID="rating-stars">
                  <StarRow rating={ratingSummary.mediaNotas} color={design.amber500} />
                  <Text style={styles.ratingScore} testID="rating-score">
                    {ratingSummary.mediaNotas.toFixed(1)}
                  </Text>
                  <Text style={styles.ratingCount} testID="rating-count">
                    {t('avaliacoes.minhaNota.totalCount', {count: ratingSummary.totalAvaliacoes})}
                  </Text>
                </View>
              ) : (
                <View style={styles.ratingStarsRow} testID="rating-empty">
                  <StarRow rating={0} color={design.textTertiary} />
                  <Text style={styles.ratingEmpty}>
                    {t('avaliacoes.minhaNota.noRatingsYet')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : null}

        {/* ── Change password card (collapsible) ── */}
        <View style={styles.section} testID="profile-change-password-card">

          {/* Header row — always visible, toggles the form */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('profile.changePassword.sectionTitle')}
            onPress={() => setPwdOpen(o => !o)}
            style={[styles.row, !pwdOpen && styles.rowLast]}
            testID="profile-change-password-toggle">
            <View style={styles.rowIcon}>
              <MaterialIcons color={design.textTertiary} name="lock-outline" size={20} accessibilityElementsHidden />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowValue}>{t('profile.changePassword.sectionTitle')}</Text>
            </View>
            <View style={styles.rowChevron}>
              <MaterialIcons
                color={design.textTertiary}
                name={pwdOpen ? 'expand-less' : 'expand-more'}
                size={20}
              />
            </View>
          </Pressable>

          {/* Collapsible inputs */}
          {pwdOpen ? (
            <>
              <View style={styles.row}>
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>{t('profile.changePassword.senhaAntiga')}</Text>
                  <TextInput
                    accessibilityLabel={t('profile.changePassword.senhaAntiga')}
                    autoCapitalize="none"
                    onChangeText={setSenhaAntiga}
                    secureTextEntry
                    style={styles.input}
                    testID="input-senha-antiga"
                    value={senhaAntiga}
                  />
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>{t('profile.changePassword.novaSenha')}</Text>
                  <TextInput
                    accessibilityLabel={t('profile.changePassword.novaSenha')}
                    autoCapitalize="none"
                    onChangeText={setNovaSenha}
                    secureTextEntry
                    style={styles.input}
                    testID="input-nova-senha"
                    value={novaSenha}
                  />
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>{t('profile.changePassword.confirmarSenha')}</Text>
                  <TextInput
                    accessibilityLabel={t('profile.changePassword.confirmarSenha')}
                    autoCapitalize="none"
                    onChangeText={setConfirmarSenha}
                    secureTextEntry
                    style={styles.input}
                    testID="input-confirmar-senha"
                    value={confirmarSenha}
                  />
                </View>
              </View>

              {/* Inline feedback */}
              {passwordFeedback ? (
                <View
                  style={[
                    styles.row,
                    {
                      backgroundColor:
                        passwordFeedback.type === 'success'
                          ? design.success
                          : design.danger,
                    },
                  ]}
                  testID="password-feedback">
                  <Text style={[styles.rowValue, {color: design.textOnDark}]}>
                    {t(passwordFeedback.messageKey)}
                  </Text>
                </View>
              ) : null}

              {/* Submit */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('profile.changePassword.submit')}
                disabled={isChangingPassword}
                onPress={() => void changePassword()}
                style={[styles.row, styles.rowLast, styles.pwdSubmitRow]}
                testID="btn-change-password">
                {isChangingPassword ? (
                  <ActivityIndicator color={design.blue500} size="small" testID="change-password-loading" />
                ) : (
                  <Text style={[styles.rowValue, {color: design.blue500}]}>
                    {t('profile.changePassword.submit')}
                  </Text>
                )}
              </Pressable>
            </>
          ) : null}
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
