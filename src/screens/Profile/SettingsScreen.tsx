/**
 * @fileoverview Settings screen — language selection and app info.
 *
 * Uses the same createProfileStyles factory as ProfileScreen.
 * All values via theme tokens, all strings via i18n.
 */
import React, {useCallback, useMemo} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Constants = require('expo-constants').default as {
  expoConfig?: {version?: string; ios?: {buildNumber?: string}; android?: {versionCode?: number}};
};
import {useTheme} from '../../theme';
import {Divider} from '@components/atoms';
import {AppHeader} from '@components/organisms';
import {useAppDispatch, useAppSelector} from '../../store';
import {setLanguage} from '@store/slices/uiSlice';
import {type AppLanguage, availableLanguages, i18n} from '../../i18n';
import {createProfileStyles} from './ProfileScreens.styles';

const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  'pt-BR': 'Português (BR)',
  'en-US': 'English (US)',
  es: 'Español',
};

/**
 * Settings screen — language selection and app version info.
 *
 * @returns The settings screen JSX element.
 */
export const SettingsScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createProfileStyles(theme), [theme]);
  const dispatch = useAppDispatch();
  const currentLanguage = useAppSelector(state => state.ui.language);

  const handleLanguageChange = useCallback(async (lang: AppLanguage): Promise<void> => {
    await i18n.changeLanguage(lang);
    dispatch(setLanguage(lang));
  }, [dispatch]);

  const appVersion = (Constants.expoConfig?.version ?? '—') as string;
  const buildNumber = String(
    (Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode) ?? '—',
  );

  return (
    <SafeAreaView edges={[]} style={styles.settingsSafeArea}>
      <AppHeader title={t('settings.title')} showBack testID="settings-header" />
      <ScrollView style={styles.background}>

        {/* Language section */}
        <Text style={styles.sectionHeader}>{t('settings.sections.language')}</Text>
        <View style={styles.section}>
          {availableLanguages.map((lang, idx) => (
            <Pressable
              key={lang}
              accessibilityRole="radio"
              accessibilityState={{checked: currentLanguage === lang}}
              onPress={() => void handleLanguageChange(lang)}
              style={[styles.radioRow, idx === availableLanguages.length - 1 && styles.rowLast]}
              testID={`language-option-${lang}`}>
              <Text style={styles.radioLabel}>{LANGUAGE_LABELS[lang]}</Text>
              <View style={styles.radioIndicator}>
                {currentLanguage === lang ? <View style={styles.radioInner} /> : null}
              </View>
            </Pressable>
          ))}
        </View>

        <Divider />

        {/* About section */}
        <Text style={styles.sectionHeader}>{t('settings.sections.about')}</Text>
        <View style={styles.section}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>{t('settings.about.version')}</Text>
            <Text style={styles.aboutValue}>{appVersion}</Text>
          </View>
          <View style={[styles.aboutRow, styles.rowLast]}>
            <Text style={styles.aboutLabel}>{t('settings.about.build')}</Text>
            <Text style={styles.aboutValue}>{buildNumber}</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

SettingsScreen.displayName = 'SettingsScreen';
