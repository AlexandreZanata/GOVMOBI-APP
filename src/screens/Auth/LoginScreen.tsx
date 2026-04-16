/**
 * @fileoverview Login screen — entry point for unauthenticated users.
 */
import React, {useMemo, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../theme';
import {createLoginStyles} from './LoginScreen.styles';
import {Text} from '../../components/atoms';
import {Input} from '../../components/atoms';
import {useAppDispatch} from '../../store';
import {setUser, setToken} from '../../store/slices/authSlice';
import {addToast} from '../../store/slices/uiSlice';
import {useFacades} from '../../services/facades';

/**
 * Login screen with email/password form.
 * In MOCK_MODE any seeded email works with any password.
 * Hint shown on screen: ana.silva@govmobile.gov
 */
export const LoginScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const {authFacade} = useFacades();
  const styles = useMemo(() => createLoginStyles(theme, insets.top), [theme, insets.top]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (): Promise<void> => {
    if (!email.trim()) return;
    setIsLoading(true);
    const result = await authFacade.login({username: email.trim(), password});
    setIsLoading(false);

    if (result.error) {
      dispatch(
        addToast({
          id: `login-error-${Date.now()}`,
          message: t('auth.loginFailed'),
          type: 'error',
        }),
      );
      return;
    }

    dispatch(setToken(result.data.accessToken));
    dispatch(setUser(result.data.user));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text variant="heading" color="textInverse" style={styles.appName}>
            {t('common.appName')}
          </Text>
          <Text variant="caption" color="textInverse" style={styles.subtitle}>
            {t('auth.subtitle')}
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text variant="subheading" style={styles.cardTitle}>
            {t('auth.login')}
          </Text>

          <Input
            label={t('auth.username')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            testID="login-email"
          />

          <Input
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            testID="login-password"
          />

          {/* Mock hint */}
          <Text variant="caption" color="textMuted" style={styles.hint}>
            {t('auth.mockHint')}
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={isLoading}
            onPress={() => void handleLogin()}
            style={[styles.button, isLoading && styles.buttonDisabled]}
            testID="login-submit">
            <Text variant="label" color="textInverse">
              {isLoading ? t('common.loading') : t('auth.login')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

LoginScreen.displayName = 'LoginScreen';
