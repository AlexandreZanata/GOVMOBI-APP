/**
 * @fileoverview Login screen — entry point for unauthenticated users.
 *
 * Safe-area & keyboard strategy:
 * - `SafeAreaView` (edges: ['top', 'bottom']) handles notch and home-indicator
 *   on both iOS and Android without manual inset arithmetic.
 * - `KeyboardAvoidingView` with `behavior="padding"` sits *inside* SafeAreaView
 *   so the offset is relative to the already-inset area, eliminating the white
 *   gap that appears on Android when placed outside the safe area.
 *
 * CPF field:
 * - Masked as `000.000.000-00` while typing via `maskCpf`.
 * - Validated on submit with `isValidCpf` (Receita Federal módulo-11 algorithm).
 * - Raw digits (sanitized) are sent to the API — never the formatted string.
 */
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
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
import {Text, Input} from '../../components/atoms';
import {useAppDispatch} from '../../store';
import {setUser, setToken} from '../../store/slices/authSlice';
import {addToast} from '../../store/slices/uiSlice';
import {useFacades} from '../../services/facades';
import {maskCpf, sanitizeCpf, isValidCpf} from '../../utils/cpf';

/**
 * Login screen with CPF + senha form.
 *
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

  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [senhaError, setSenhaError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /** Apply CPF mask on every keystroke. */
  const handleCpfChange = useCallback((text: string) => {
    setCpf(maskCpf(text));
    if (cpfError) setCpfError('');
  }, [cpfError]);

  const handleSenhaChange = useCallback((text: string) => {
    setSenha(text);
    if (senhaError) setSenhaError('');
  }, [senhaError]);

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
  }, [cpf, senha, authFacade, dispatch, t]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
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
              testID="login-cpf"
            />

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
