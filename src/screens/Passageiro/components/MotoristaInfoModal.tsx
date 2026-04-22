/* eslint-disable react-native/no-unused-styles */
/**
 * @fileoverview MotoristaInfoModal — shows driver and vehicle info when ride is accepted.
 *
 * Displayed automatically when the ride status changes to ACEITA and the driver
 * info becomes available. The passenger can dismiss it to continue tracking.
 */
import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {useTheme, type Theme} from '../../../theme';
import {useFacades} from '@services/facades';
import type {Motorista} from '@models/Motorista';
import type {Veiculo} from '@models/index';

export interface MotoristaInfoModalProps {
  /** Whether the modal is visible. */
  visible: boolean;
  /** Driver UUID. */
  motoristaId: string | null;
  /** Vehicle UUID. */
  veiculoId: string | null;
  /** Called when the user dismisses the modal. */
  onDismiss: () => void;
}

/**
 * Modal showing driver and vehicle information when a ride is accepted.
 *
 * @param props - {@link MotoristaInfoModalProps}
 * @returns JSX element for the driver info modal.
 */
export const MotoristaInfoModal = ({
  visible,
  motoristaId,
  veiculoId,
  onDismiss,
}: MotoristaInfoModalProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const {frotaFacade} = useFacades();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [motorista, setMotorista] = useState<Motorista | null>(null);
  const [veiculo, setVeiculo] = useState<Veiculo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !motoristaId) {
      setMotorista(null);
      setVeiculo(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const load = async (): Promise<void> => {
      const [motResult, veiResult] = await Promise.all([
        frotaFacade.getMotoristaById(motoristaId),
        veiculoId ? frotaFacade.getVeiculoById(veiculoId) : Promise.resolve({data: null, error: null}),
      ]);

      if (cancelled) return;

      if (motResult.error) {
        setError(t('errors.unknownError'));
        setIsLoading(false);
        return;
      }

      setMotorista(motResult.data ?? null);
      setVeiculo(veiResult.data ?? null);
      setIsLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [visible, motoristaId, veiculoId, frotaFacade, t]);

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  return (
    <Modal
      animationType="fade"
      onRequestClose={handleDismiss}
      transparent
      visible={visible}>
      <View style={styles.backdrop} testID="motorista-info-modal">
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialIcons
              color={theme.colors.primary}
              name="person"
              size={32}
            />
            <Text style={styles.title}>{t('motorista.info.title')}</Text>
          </View>

          {/* Content */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.colors.primary} size="large" />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.content}>
              {/* Driver info */}
              <View style={styles.section}>
                <Text style={styles.label}>{t('motorista.info.cnhLabel')}</Text>
                <Text style={styles.value}>{motorista?.cnhNumero ?? '—'}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>{t('motorista.info.cnhCategoriaLabel')}</Text>
                <Text style={styles.value}>{motorista?.cnhCategoria ?? '—'}</Text>
              </View>

              {/* Vehicle info */}
              {veiculo && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.section}>
                    <Text style={styles.label}>{t('motorista.info.veiculoLabel')}</Text>
                    <Text style={styles.value}>{veiculo.modelo}</Text>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.label}>{t('motorista.info.placaLabel')}</Text>
                    <Text style={styles.value}>{veiculo.placa}</Text>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.label}>{t('motorista.info.anoLabel')}</Text>
                    <Text style={styles.value}>{veiculo.ano}</Text>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Footer */}
          <Pressable
            accessibilityLabel={t('common.confirm')}
            accessibilityRole="button"
            onPress={handleDismiss}
            style={styles.button}
            testID="dismiss-btn">
            <Text style={styles.buttonText}>{t('common.confirm')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

MotoristaInfoModal.displayName = 'MotoristaInfoModal';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing[5],
    },
    card: {
      backgroundColor: theme.design.surface100,
      borderRadius: theme.borderRadius.radius.lg,
      width: '100%',
      maxWidth: 400,
      ...theme.shadows.card,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[3],
      paddingHorizontal: theme.spacing[5],
      paddingTop: theme.spacing[5],
      paddingBottom: theme.spacing[4],
    },
    title: {
      ...theme.typography.scale.headingMd,
      color: theme.design.textPrimary,
      flex: 1,
    },
    content: {
      paddingHorizontal: theme.spacing[5],
      paddingBottom: theme.spacing[4],
      gap: theme.spacing[3],
    },
    section: {
      gap: theme.spacing[1],
    },
    label: {
      ...theme.typography.scale.labelSm,
      color: theme.design.textSecondary,
      textTransform: 'uppercase',
    },
    value: {
      ...theme.typography.scale.bodyLg,
      color: theme.design.textPrimary,
    },
    divider: {
      height: 1,
      backgroundColor: theme.design.surface300,
      marginVertical: theme.spacing[2],
    },
    loadingContainer: {
      paddingVertical: theme.spacing[6],
      alignItems: 'center',
    },
    errorContainer: {
      paddingHorizontal: theme.spacing[5],
      paddingVertical: theme.spacing[4],
    },
    errorText: {
      ...theme.typography.scale.bodyMd,
      color: theme.design.danger,
      textAlign: 'center',
    },
    button: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing[4],
      borderBottomLeftRadius: theme.borderRadius.radius.lg,
      borderBottomRightRadius: theme.borderRadius.radius.lg,
      alignItems: 'center',
    },
    buttonText: {
      ...theme.typography.scale.labelLg,
      color: theme.design.textOnDark,
    },
  });
