/**
 * @fileoverview Login screen — entry point for unauthenticated users.
 *
 * Safe-area & keyboard strategy:
 * - `SafeAreaView` (edges: ['top', 'bottom']) handles notch and home-indicator
 *   on both iOS and Android without manual inset arithmetic.
 * - `KeyboardAvoidingView` with `behavior="padding"` sits *inside* SafeAreaView
 *   so the offset is relative to the already-inset area. This eliminates the
 *   white gap that appears on Android when the view is placed outside the safe
 *   area with `behavior="height"`.
 * - `ScrollView` with `keyboardShouldPersistTaps="handled"` ensures taps on
 *   the Login button dismiss the keyboard and trigger the handler correctly.
 */
import React, {useMemo, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../theme';
import {createLoginStyles} from './LoginScreen.styles';
import {Text, Input} from '../../components/atoms';
import {useAppDispatch} from '../../store';
import {setUser, setToken} from '../../store/slices/authSlice';
import {addToast} from '../../store/slices/uiSlice';
import {useFacades} from '../../services/facades';

/**
 * Login screen with email/password form.
 *
 * In MOCK_MODE any seeded email works with any password.
 * Demo credential shown on screen: ana.silva@govmobile.gov
 *
 * @returns The login screen JSX element.
 */
export const LoginScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const {authFacade} = useFacades();
  const styles = useMemo(() => createLoginStyles(theme), [theme]);

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
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Brand header */}
          <View style={styles.header}>
            <Text variant="heading" color="textInverse" style={styles.appName}>
              {t('common.appName')}
            </Text>
            <Text variant="caption" color="textInverse" style={styles.subtitle}>
              {t('auth.subtitle')}
            </Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text variant="subheading" style={styles.cardTitle}>
              {t('auth.login')}
            </Text>

            <Input
              label={t('auth.username')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
              testID="login-email"
            />

            <Input
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={() => void handleLogin()}
              testID="login-password"
            />

            <Text variant="caption" color="textMuted" style={styles.hint}>
              {t('auth.mockHint')}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{disabled: isLoading}}
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
    </SafeAreaView>
  );
};

LoginScreen.displayName = 'LoginScreen';
