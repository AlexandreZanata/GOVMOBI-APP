/**
 * @fileoverview SolicitarCorridaModal — bottom-sheet modal for ride request.
 *
 * Appears when the user presses "Request Ride" on the PassageiroScreen dashboard.
 * Collects motivoServico (required) and observacoes (optional), then calls
 * POST /corridas. On 202, closes itself and triggers onSuccess with the corridaId.
 *
 * Styled to match the PassageiroScreen white bottom-sheet design language.
 */
import React, {useCallback, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme} from '@theme/index';
import {useFacades} from '@services/facades';
import {useAppDispatch, useAppSelector} from '@store/index';
import {setActiveCorrida, setPendingCorridaId} from '@store/slices/corridaSlice';
import {addToast} from '@store/slices/uiSlice';
import {PassageiroColors as C} from '../PassageiroScreen.styles';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SolicitarCorridaModalProps {
  /** Whether the modal is visible. */
  visible: boolean;
  /** Called when the modal should close (cancel or backdrop press). */
  onClose: () => void;
  /**
   * Called after a successful POST /corridas (202).
   * @param corridaId - The UUID returned by the server.
   */
  onSuccess: (corridaId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Bottom-sheet modal for collecting ride request details.
 * Validates motivoServico before submitting.
 *
 * @param props - {@link SolicitarCorridaModalProps}
 * @returns JSX element for the SolicitarCorridaModal.
 */
export const SolicitarCorridaModal = ({
  visible,
  onClose,
  onSuccess,
}: SolicitarCorridaModalProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const {corridaFacade} = useFacades();

  const userId = useAppSelector(s => s.auth.user?.id ?? '');
  const selectedDestino = useAppSelector(s => s.corrida.selectedDestino);
  const userLocation = useAppSelector(s => s.corrida.userLocationSnapshot);

  const [motivoServico, setMotivoServico] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [motivoError, setMotivoError] = useState(false);

  // Slide-up animation
  const slideAnim = useRef(new Animated.Value(300)).current;

  const handleShow = useCallback(() => {
    slideAnim.setValue(300);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [slideAnim]);

  const resetForm = useCallback(() => {
    setMotivoServico('');
    setObservacoes('');
    setMotivoError(false);
    setIsSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!motivoServico.trim()) {
      setMotivoError(true);
      return;
    }
    setMotivoError(false);

    if (!selectedDestino) {
      dispatch(
        addToast({
          id: `no-dest-${Date.now()}`,
          message: t('passageiro.errors.selectDestination'),
          type: 'warning',
        }),
      );
      return;
    }

    // Guard: passageiroId is required by the API — block if user session not ready
    if (!userId) {
      dispatch(
        addToast({
          id: `no-user-${Date.now()}`,
          message: t('errors.sessionExpired'),
          type: 'warning',
        }),
      );
      return;
    }

    setIsSubmitting(true);

    const origemLat = userLocation?.latitude ?? -16.6869;
    const origemLng = userLocation?.longitude ?? -49.2648;

    const result = await corridaFacade.solicitarCorrida({
      passageiroId: userId,
      origemLat,
      origemLng,
      destinoLat: selectedDestino.latitude,
      destinoLng: selectedDestino.longitude,
      motivoServico: motivoServico.trim(),
      observacoes: observacoes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.error) {
      // Log the actual server error so it's visible in Metro/Logcat
      console.warn('[SolicitarCorrida] request failed', {
        code: result.error.code,
        status: result.error.statusCode,
        message: result.error.message,
        passageiroId: userId,
        origemLat,
        origemLng,
        destinoLat: selectedDestino.latitude,
        destinoLng: selectedDestino.longitude,
      });

      // 409 CONFLICT — passenger already has an active ride on the server.
      // Recover: fetch the existing ride, seed Redux, close modal, and inform the user.
      if (result.error.code === 'CONFLICT') {
        const activeResult = await corridaFacade.getActiveCorrida();
        if (activeResult.data) {
          dispatch(setActiveCorrida(activeResult.data));
          dispatch(setPendingCorridaId(activeResult.data.id));
        }
        dispatch(
          addToast({
            id: `solicitar-conflict-${Date.now()}`,
            message: t('passageiro.errors.alreadyHasActiveRide'),
            type: 'warning',
          }),
        );
        resetForm();
        onClose();
        return;
      }

      dispatch(
        addToast({
          id: `solicitar-err-${Date.now()}`,
          message: t('passageiro.errors.requestFailed'),
          type: 'error',
        }),
      );
      return;
    }

    const {corridaId} = result.data;

    // Seed Redux so AcompanharCorrida renders immediately without a GET
    dispatch(setPendingCorridaId(corridaId));
    dispatch(
      setActiveCorrida({
        id: corridaId,
        passageiroId: userId,
        motoristaId: null,
        veiculoId: null,
        origemLat,
        origemLng,
        destinoLat: selectedDestino.latitude,
        destinoLng: selectedDestino.longitude,
        motivoServico: motivoServico.trim(),
        observacoes: observacoes.trim() || undefined,
        status: 'SOLICITADA',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );

    dispatch(
      addToast({
        id: `solicitar-ok-${Date.now()}`,
        message: t('passageiro.requestSuccess'),
        type: 'success',
      }),
    );

    resetForm();
    onSuccess(corridaId);
  }, [
    corridaFacade,
    dispatch,
    motivoServico,
    observacoes,
    onClose,
    onSuccess,
    resetForm,
    selectedDestino,
    t,
    userId,
    userLocation,
  ]);

  const styles = createStyles(insets.bottom);

  return (
    <Modal
      animationType="none"
      onRequestClose={handleClose}
      onShow={handleShow}
      statusBarTranslucent
      transparent
      visible={visible}>
      {/* Backdrop */}
      <Pressable
        accessibilityLabel={t('common.cancel')}
        onPress={handleClose}
        style={styles.backdrop}
        testID="modal-backdrop"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents="box-none"
        style={styles.keyboardView}>
        <Animated.View
          style={[styles.sheet, {transform: [{translateY: slideAnim}]}]}
          testID="solicitar-modal">

          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{t('corridas.solicitar.modalTitle')}</Text>
              {selectedDestino && (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {selectedDestino.placeName}
                </Text>
              )}
            </View>
            <Pressable
              accessibilityLabel={t('common.cancel')}
              accessibilityRole="button"
              hitSlop={8}
              onPress={handleClose}
              style={styles.closeBtn}
              testID="modal-close-btn">
              <MaterialIcons name="close" size={18} color={C.textMid} />
            </Pressable>
          </View>

          <View style={styles.divider} />

          {/* Motivo Serviço */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {t('corridas.solicitar.motivoLabel')}
              <Text style={[styles.fieldLabel, {color: theme.colors.error}]}> *</Text>
            </Text>
            <TextInput
              accessibilityLabel={t('corridas.solicitar.motivoLabel')}
              autoFocus
              multiline
              numberOfLines={3}
              onChangeText={text => {
                setMotivoServico(text);
                if (text.trim()) setMotivoError(false);
              }}
              placeholder={t('corridas.solicitar.motivoPlaceholder')}
              placeholderTextColor={C.textMuted}
              style={[
                styles.textInput,
                styles.textInputMultiline,
                motivoError && styles.textInputError,
              ]}
              testID="motivo-input"
              value={motivoServico}
            />
            {motivoError && (
              <Text style={styles.errorText} testID="motivo-error">
                {t('corridas.solicitar.motivoRequired')}
              </Text>
            )}
          </View>

          {/* Observações */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {t('corridas.solicitar.observacoesLabel')}
            </Text>
            <TextInput
              accessibilityLabel={t('corridas.solicitar.observacoesLabel')}
              multiline
              numberOfLines={2}
              onChangeText={setObservacoes}
              placeholder={t('corridas.solicitar.observacoesPlaceholder')}
              placeholderTextColor={C.textMuted}
              style={[styles.textInput, styles.textInputShort]}
              testID="observacoes-input"
              value={observacoes}
            />
          </View>

          {/* Submit */}
          <Pressable
            accessibilityLabel={t('corridas.solicitar.submit')}
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={() => {
              void handleSubmit();
            }}
            style={({pressed}) => [
              styles.submitBtn,
              pressed && styles.submitBtnPressed,
              isSubmitting && styles.submitBtnDisabled,
            ]}
            testID="btn-solicitar-modal">
            {isSubmitting ? (
              <ActivityIndicator color={C.surfaceCard} size="small" />
            ) : (
              <Text style={styles.submitBtnText}>{t('corridas.solicitar.submit')}</Text>
            )}
          </Pressable>

          {/* Safe area spacer */}
          <View style={{height: insets.bottom > 0 ? insets.bottom : 8}} />
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

SolicitarCorridaModal.displayName = 'SolicitarCorridaModal';

// ---------------------------------------------------------------------------
// Styles — use PassageiroColors to stay consistent with the dashboard
// ---------------------------------------------------------------------------

const createStyles = (bottomInset: number) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(9,9,11,0.55)',
    },
    keyboardView: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: C.surfaceCard,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 0,
      paddingBottom: bottomInset > 0 ? bottomInset : 8,
      shadowColor: C.shadow,
      shadowOffset: {width: 0, height: -6},
      shadowOpacity: 0.14,
      shadowRadius: 24,
      elevation: 20,
    },
    handle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.handleLight,
      marginTop: 10,
      marginBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: C.textDark,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 13,
      color: C.textMuted,
      marginTop: 3,
      maxWidth: 260,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: C.closeBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: C.dividerLight,
      marginBottom: 18,
    },
    fieldGroup: {
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: C.textMid,
      marginBottom: 8,
      letterSpacing: 0.1,
    },
    textInput: {
      backgroundColor: C.surfaceSubtle,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.dividerLight,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: C.textDark,
    },
    textInputMultiline: {
      minHeight: 88,
      textAlignVertical: 'top',
    },
    textInputShort: {
      minHeight: 60,
      textAlignVertical: 'top',
    },
    textInputError: {
      borderColor: C.errorRed,
      backgroundColor: '#FFF5F5',
    },
    errorText: {
      fontSize: 12,
      color: C.errorRed,
      marginTop: 5,
    },
    submitBtn: {
      height: 54,
      backgroundColor: C.interactive,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      shadowColor: C.interactive,
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 6,
    },
    submitBtnPressed: {
      backgroundColor: C.interactivePress,
      transform: [{scale: 0.98}],
    },
    submitBtnDisabled: {
      opacity: 0.45,
    },
    submitBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: C.surfaceCard,
      letterSpacing: 0.3,
    },
  });
