/**
 * @fileoverview SolicitarCorridaScreen — passenger ride request form.
 *
 * Collects motivoServico (required) and observacoes (optional),
 * then calls POST /corridas via the facade. On 202, navigates to
 * AcompanharCorrida with the returned corridaId.
 */
import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme} from '../../theme';
import {createCorridasStyles} from './CorridasScreens.styles';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '../../store';
import {setPendingCorridaId, setActiveCorrida} from '@store/slices/corridaSlice';
import {addToast} from '@store/slices/uiSlice';
import type {PassageiroCorridasStackParamList} from '@navigation/types';

type NavProp = NativeStackNavigationProp<PassageiroCorridasStackParamList>;

/**
 * Ride request form screen.
 * Requires motivoServico; observacoes is optional.
 * Uses the selected destination from the corrida Redux slice (set by PassageiroScreen).
 *
 * @returns JSX element for the SolicitarCorridaScreen.
 */
export const SolicitarCorridaScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const dispatch = useAppDispatch();
  const {corridaFacade} = useFacades();

  const styles = useMemo(() => createCorridasStyles(theme), [theme]);

  const userId = useAppSelector(s => s.auth.user?.id ?? '');
  const selectedDestino = useAppSelector(s => s.corrida.selectedDestino);

  const [motivoServico, setMotivoServico] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [motivoError, setMotivoError] = useState(false);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!motivoServico.trim()) {
      setMotivoError(true);
      return;
    }
    setMotivoError(false);

    if (!selectedDestino) {
      dispatch(addToast({
        id: `no-dest-${Date.now()}`,
        message: t('passageiro.errors.selectDestination'),
        type: 'warning',
      }));
      return;
    }

    setIsSubmitting(true);

    const result = await corridaFacade.solicitarCorrida({
      origemLat: -16.6869, // In production: from GPS
      origemLng: -49.2648,
      destinoLat: selectedDestino.latitude,
      destinoLng: selectedDestino.longitude,
      motivoServico: motivoServico.trim(),
      observacoes: observacoes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.error) {
      dispatch(addToast({
        id: `solicitar-err-${Date.now()}`,
        message: t('passageiro.errors.requestFailed'),
        type: 'error',
      }));
      return;
    }

    dispatch(setPendingCorridaId(result.data.corridaId));
    // Seed a minimal corrida object so AcompanharCorrida can render immediately
    dispatch(setActiveCorrida({
      id: result.data.corridaId,
      passageiroId: userId,
      motoristaId: null,
      veiculoId: null,
      origemLat: -16.6869,
      origemLng: -49.2648,
      destinoLat: selectedDestino.latitude,
      destinoLng: selectedDestino.longitude,
      motivoServico: motivoServico.trim(),
      observacoes: observacoes.trim() || undefined,
      status: 'solicitada',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    navigation.replace('AcompanharCorrida', {corridaId: result.data.corridaId});
  }, [corridaFacade, dispatch, motivoServico, navigation, observacoes, selectedDestino, t, userId]);

  const inputBorderColor = (hasError: boolean) =>
    hasError ? theme.colors.error : theme.colors.border;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      testID="solicitar-screen">
      <ScrollView
        contentContainerStyle={[styles.scrollContent, {paddingTop: insets.top + theme.spacing[4]}]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Destination summary */}
        {selectedDestino && (
          <View style={styles.card} testID="destino-summary">
            <Text style={styles.cardLabel}>{t('corridas.solicitar.destino')}</Text>
            <Text style={styles.cardValue}>{selectedDestino.placeName}</Text>
          </View>
        )}

        {/* Motivo Serviço */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>
            {t('corridas.solicitar.motivoLabel')}
            {' '}
            <Text style={{color: theme.colors.error}}>*</Text>
          </Text>
          <TextInput
            accessibilityLabel={t('corridas.solicitar.motivoLabel')}
            multiline
            numberOfLines={3}
            onChangeText={text => {
              setMotivoServico(text);
              if (text.trim()) setMotivoError(false);
            }}
            placeholder={t('corridas.solicitar.motivoPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            style={[
              styles.cardValue,
              styles.formInputMultiline,
              {borderColor: inputBorderColor(motivoError)},
            ]}
            testID="motivo-input"
            value={motivoServico}
          />
          {motivoError && (
            <Text style={[theme.typography.scale.caption, {color: theme.colors.error}]} testID="motivo-error">
              {t('corridas.solicitar.motivoRequired')}
            </Text>
          )}
        </View>

        {/* Observações */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('corridas.solicitar.observacoesLabel')}</Text>
          <TextInput
            accessibilityLabel={t('corridas.solicitar.observacoesLabel')}
            multiline
            numberOfLines={2}
            onChangeText={setObservacoes}
            placeholder={t('corridas.solicitar.observacoesPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            style={[
              styles.cardValue,
              styles.formInputShort,
              {borderColor: theme.colors.border},
            ]}
            testID="observacoes-input"
            value={observacoes}
          />
        </View>

        {/* Submit */}
        <Pressable
          accessibilityLabel={t('corridas.solicitar.submit')}
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={() => { void handleSubmit(); }}
          style={[
            styles.actionButton,
            styles.actionButtonPrimary,
            isSubmitting && styles.actionButtonDisabled,
          ]}
          testID="btn-solicitar">
          {isSubmitting ? (
            <ActivityIndicator color={theme.colors.textInverse} size="small" />
          ) : (
            <Text style={styles.actionButtonText}>{t('corridas.solicitar.submit')}</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

SolicitarCorridaScreen.displayName = 'SolicitarCorridaScreen';
