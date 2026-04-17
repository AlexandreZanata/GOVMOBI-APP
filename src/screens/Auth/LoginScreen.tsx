/**
 * @fileoverview Redesigned Login screen — entry point for unauthenticated users.
 *
 * Layout (Design_Prompt §4 Screen 1):
 * - Full dark background (navy800)
 * - Top area (~35%): 4-square logo mark + "GovMobile" (displayLg) + subtitle
 * - Bottom area (~65%): rounded-top white card with CPF + password form
 *
 * Safe-area & keyboard strategy:
 * - `SafeAreaView` (edges: top, bottom) handles notch and home-indicator.
 * - `KeyboardAvoidingView` with `behavior="padding"` sits inside SafeAreaView.
 * - `ScrollView` with `justifyContent: 'flex-end'` keeps the card anchored
 *   to the bottom while the logo area fills remaining space.
 *
 * CPF field:
 * - Masked as `000.000.000-00` while typing via `maskCpf`.
 * - Validated on submit with `isValidCpf` (Receita Federal módulo-11).
 * - Raw digits (sanitized) are sent to the API — never the formatted string.
 */
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../theme';
import {createLoginStyles} from './LoginScreen.styles';
import {Text, Input, Icon} from '@components/atoms';
import {useAppDispatch} from '../../store';
import {setUser, setToken, setPapeis} from '@store/slices/authSlice';
import {addToast} from '@store/slices/uiSlice';
import {useFacades} from '@services/facades';
import {maskCpf, sanitizeCpf, isValidCpf} from '@utils/cpf';
// expo-constants is available at runtime via Expo's module resolution;
// the type declaration is provided by the project-level mock.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Constants = require('expo-constants').default as {
  expoConfig?: {version?: string};
};

/**
 * Login screen with CPF + senha form.
 *
 * Renders a dark immersive background with a bottom-anchored white card.
 * CPF is masked on input and validated before submission.
 * Raw digits are sent to `POST /auth/login` as `{ cpf, senha }`.
 *
 * @returns The login screen JSX element.
 */
export const LoginScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const {authFacade} = useFacades();
  const styles = useMemo(() => createLoginStyles(theme), [theme]);

  const passwordRef = useRef<TextInput>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;

  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [senhaError, setSenhaError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const appVersion: string =
    (Constants.expoConfig?.version as string | undefined) ?? '1.0.0';

  /** Apply CPF mask on every keystroke. */
  const handleCpfChange = useCallback(
    (text: string) => {
      setCpf(maskCpf(text));
      if (cpfError) setCpfError('');
    },
    [cpfError],
  );

  const handleSenhaChange = useCallback(
    (text: string) => {
      setSenha(text);
      if (senhaError) setSenhaError('');
    },
    [senhaError],
  );

  /** Animate button press — scale down then restore. */
  const animatePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.98,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [buttonScale]);

  /** Validate fields and call the auth facade. */
  const handleLogin = useCallback(async (): Promise<void> => {
    const rawCpf = sanitizeCpf(cpf);
    let valid = true;

    if (!rawCpf) {
      setCpfError(t('auth.cpfRequired'));
      valid = false;
    } else if (!isValidCpf(rawCpf)) {
      setCpfError(t('auth.cpfInvalid'));
      valid = false;
    }

    if (!senha.trim()) {
      setSenhaError(t('auth.passwordRequired'));
      valid = false;
    }

    if (!valid) return;

    animatePress();
    setIsLoading(true);
    const result = await authFacade.login({cpf: rawCpf, senha});
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

    // Fetch papeis from /auth/me for role-based routing
    const meResult = await authFacade.getMe();
    if (meResult.data) {
      // MeResponse has papeis array — store for routing
      const meRaw = meResult.data as unknown as {papeis?: string[]};
      dispatch(setPapeis(meRaw.papeis ?? []));
    }
  }, [cpf, senha, authFacade, dispatch, t, animatePress]);

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={styles.safeArea}
      testID="login-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Logo / brand area ── */}
          <View style={styles.logoArea} testID="login-logo-area">
            {/* 4-square geometric mark */}
            <View style={styles.logoMark} accessibilityElementsHidden>
              <View style={styles.logoSquare} />
              <View style={styles.logoSquare} />
              <View style={styles.logoSquare} />
              <View style={styles.logoSquare} />
            </View>

            <Text
              style={styles.appName}
              accessibilityRole="header"
              testID="login-app-name">
              {t('common.appName')}
            </Text>

            <Text style={styles.subtitle} testID="login-subtitle">
              {t('auth.subtitle')}
            </Text>
          </View>

          {/* ── Form card ── */}
          <View style={styles.card} testID="login-card">
            <Text style={styles.cardTitle} testID="login-title">
              {t('auth.login')}
            </Text>

            {/* CPF field */}
            <Input
              label={t('auth.cpf')}
              value={cpf}
              onChangeText={handleCpfChange}
              placeholder={t('auth.cpfPlaceholder')}
              keyboardType="numeric"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              maxLength={14}
              error={cpfError}
              onSubmitEditing={() => passwordRef.current?.focus()}
              leftIcon={
                <Icon
                  name="badge"
                  color="textMuted"
                  size="md"
                  testID="login-cpf-icon"
                />
              }
              testID="login-cpf"
            />

            {/* Password field */}
            <Input
              ref={passwordRef}
              label={t('auth.password')}
              value={senha}
              onChangeText={handleSenhaChange}
              secureTextEntry
              secureToggle
              returnKeyType="done"
              error={senhaError}
              onSubmitEditing={() => void handleLogin()}
              leftIcon={
                <Icon
                  name="lock"
                  color="textMuted"
                  size="md"
                  testID="login-password-icon"
                />
              }
              testID="login-password"
            />

            {/* Login button */}
            <Animated.View style={{transform: [{scale: buttonScale}]}}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('auth.login')}
                accessibilityState={{disabled: isLoading, busy: isLoading}}
                disabled={isLoading}
                onPress={() => void handleLogin()}
                style={({pressed}) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                  isLoading && styles.buttonDisabled,
                ]}
                testID="login-submit">
                {isLoading ? (
                  <ActivityIndicator
                    color={theme.design.amber500}
                    testID="login-loading"
                  />
                ) : (
                  <Text style={styles.buttonLabel}>{t('auth.login')}</Text>
                )}
              </Pressable>
            </Animated.View>

            {/* App version */}
            <Text style={styles.version} testID="login-version">
              {t('auth.version', {version: appVersion})}
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

LoginScreen.displayName = 'LoginScreen';
