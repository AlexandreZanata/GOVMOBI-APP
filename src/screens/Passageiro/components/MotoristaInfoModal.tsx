/**
 * @fileoverview MotoristaInfoModal — shows driver name, vehicle info, and a
 * status-driven action headline when a ride is accepted / driver is en route.
 *
 * Displays:
 *  - Status headline (i18n): "MOTORISTA ACEITOU", "MOTORISTA A CAMINHO", "MOTORISTA CHEGOU!"
 *  - Driver name (from GET /servidores/:servidorId)
 *  - Vehicle model, plate, year (from GET /frota/veiculos/:veiculoId)
 *
 * Intentionally omits CNH number and category — those are internal driver
 * credentials and must never be shown to passengers.
 */
/* eslint-disable react-native/no-unused-styles */
/* eslint-disable react-native/no-color-literals */
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
import type {Veiculo} from '@models/index';
import type {CorridaStatus} from '@models/Corrida';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MotoristaInfoModalProps {
  /** Whether the modal is visible. */
  visible: boolean;
  /** Motorista UUID — used to fetch servidorId → nome. */
  motoristaId: string | null;
  /** Vehicle UUID. */
  veiculoId: string | null;
  /** Current ride status — drives the headline copy. */
  corridaStatus: CorridaStatus | null;
  /** Called when the user dismisses the modal. */
  onDismiss: () => void;
  /**
   * Driver name pre-resolved from the `CorridaAceita` WebSocket event.
   * When provided, the modal skips the REST fetch for the driver name and
   * displays this value immediately — avoids a round-trip on every open.
   * Pass null to fall back to the REST fetch.
   */
  nomeMotorista?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps a ride status to its i18n key for the modal headline.
 * Returns null for statuses where the modal should not be shown.
 *
 * @param status - Current corrida status.
 * @returns i18n key string or null.
 */
const headlineKey = (status: CorridaStatus | null): string | null => {
  switch (status) {
    case 'aceita':             return 'motorista.info.statusAceita';
    case 'em_rota':            return 'motorista.info.statusEmRota';
    case 'passageiro_a_bordo': return 'motorista.info.statusPassageiroABordo';
    default:                   return null;
  }
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Modal showing driver name, vehicle info, and a status-driven headline.
 *
 * @param props - {@link MotoristaInfoModalProps}
 * @returns JSX element for the driver info modal.
 */
export const MotoristaInfoModal = ({
  visible,
  motoristaId,
  veiculoId,
  corridaStatus,
  onDismiss,
  nomeMotorista: nomeProp = null,
}: MotoristaInfoModalProps): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const {frotaFacade, servidoresFacade} = useFacades();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [motoristaNome, setMotoristaNome] = useState<string | null>(nomeProp);
  const [veiculo, setVeiculo] = useState<Veiculo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync the prop into local state whenever it changes (e.g. WS cache populated
  // after the modal was already open).
  useEffect(() => {
    if (nomeProp) setMotoristaNome(nomeProp);
  }, [nomeProp]);

  useEffect(() => {
    if (!visible || !motoristaId) {
      // Only clear name if we don't have a cached value from the prop.
      if (!nomeProp) setMotoristaNome(null);
      setVeiculo(null);
      setError(null);
      return;
    }

    let cancelled = false;
    // Only show loading spinner if we still need to fetch the name.
    setIsLoading(!nomeProp);
    setError(null);

    const load = async (): Promise<void> => {
      // Step 1: get the Motorista record to obtain servidorId
      console.log('[MotoristaInfoModal] load() → getMotoristaById', motoristaId);
      const motResult = await frotaFacade.getMotoristaById(motoristaId);
      console.log('[MotoristaInfoModal] getMotoristaById result →', JSON.stringify({
        data: motResult.data,
        error: motResult.error,
      }));
      if (cancelled) return;

      if (motResult.error || !motResult.data) {
        console.warn('[MotoristaInfoModal] getMotoristaById failed — showing error');
        if (!nomeProp) setError(t('errors.unknownError'));
        setIsLoading(false);
        return;
      }

      const {servidorId} = motResult.data;
      console.log('[MotoristaInfoModal] servidorId →', servidorId, '| veiculoId →', veiculoId, '| nomeProp →', nomeProp);

      // Step 2: fetch Servidor (for nome) and Veiculo in parallel.
      // Skip the servidor fetch if we already have the name from the WS cache.
      const [srvResult, veiResult] = await Promise.all([
        nomeProp
          ? Promise.resolve({data: null, error: null})
          : servidoresFacade.getServidorById({id: servidorId}),
        veiculoId
          ? frotaFacade.getVeiculoById(veiculoId)
          : Promise.resolve({data: null, error: null}),
      ]);

      console.log('[MotoristaInfoModal] getServidorById result →', JSON.stringify({
        data: srvResult.data,
        error: srvResult.error,
      }));
      console.log('[MotoristaInfoModal] getVeiculoById result →', JSON.stringify({
        data: veiResult.data,
        error: veiResult.error,
      }));

      if (cancelled) return;

      if (!nomeProp) setMotoristaNome(srvResult.data?.nome ?? null);
      setVeiculo(veiResult.data ?? null);
      setIsLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, [visible, motoristaId, veiculoId, nomeProp, frotaFacade, servidoresFacade, t]);

  const handleDismiss = useCallback(() => { onDismiss(); }, [onDismiss]);

  const key = headlineKey(corridaStatus);

  return (
    <Modal
      animationType="fade"
      onRequestClose={handleDismiss}
      transparent
      visible={visible}>
      <View style={styles.backdrop} testID="motorista-info-modal">
        <View style={styles.card}>

          {/* Headline — status-driven action label */}
          {key && (
            <View style={styles.headline}>
              <MaterialIcons
                color={theme.colors.primary}
                name={corridaStatus === 'passageiro_a_bordo' ? 'check-circle' : 'directions-car'}
                size={22}
              />
              <Text style={styles.headlineText}>{t(key)}</Text>
            </View>
          )}

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
              {/* Driver name */}
              <View style={styles.driverRow}>
                <View style={styles.avatar}>
                  <MaterialIcons name="person" size={28} color={theme.colors.primary} />
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverLabel}>{t('motorista.info.nomeLabel')}</Text>
                  <Text style={styles.driverName} numberOfLines={1}>
                    {motoristaNome ?? t('motorista.info.fallbackNome')}
                  </Text>
                </View>
              </View>

              {/* Vehicle */}
              {veiculo && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.vehicleRow}>
                    <MaterialIcons
                      name="directions-car"
                      size={18}
                      color={theme.design.textSecondary}
                    />
                    <View style={styles.vehicleInfo}>
                      <Text style={styles.vehicleModel}>
                        {`${veiculo.modelo} · ${veiculo.ano}`}
                      </Text>
                      <Text style={styles.vehiclePlate}>{veiculo.placa}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Dismiss button */}
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
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing[5],
    },
    card: {
      backgroundColor: theme.design.surface100,
      borderRadius: theme.borderRadius.radius.xl,
      width: '100%',
      maxWidth: 400,
      overflow: 'hidden',
      ...theme.shadows.card,
    },
    headline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[2],
      paddingHorizontal: theme.spacing[5],
      paddingTop: theme.spacing[5],
      paddingBottom: theme.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.design.surface300,
    },
    headlineText: {
      ...theme.typography.scale.headingMd,
      color: theme.colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    content: {
      paddingHorizontal: theme.spacing[5],
      paddingTop: theme.spacing[4],
      paddingBottom: theme.spacing[2],
      gap: theme.spacing[3],
    },
    driverRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[3],
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.design.surface200,
      alignItems: 'center',
      justifyContent: 'center',
    },
    driverInfo: {
      flex: 1,
      gap: theme.spacing[1],
    },
    driverLabel: {
      ...theme.typography.scale.labelSm,
      color: theme.design.textSecondary,
      textTransform: 'uppercase',
    },
    driverName: {
      ...theme.typography.scale.headingSm,
      color: theme.design.textPrimary,
    },
    divider: {
      height: 1,
      backgroundColor: theme.design.surface300,
    },
    vehicleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing[3],
    },
    vehicleInfo: {
      flex: 1,
      gap: theme.spacing[1],
    },
    vehicleModel: {
      ...theme.typography.scale.bodyMd,
      color: theme.design.textPrimary,
      fontWeight: '600',
    },
    vehiclePlate: {
      ...theme.typography.scale.labelMd,
      color: theme.design.textSecondary,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    loadingContainer: {
      paddingVertical: theme.spacing[8],
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
      marginTop: theme.spacing[4],
      paddingVertical: theme.spacing[4],
      alignItems: 'center',
    },
    buttonText: {
      ...theme.typography.scale.labelLg,
      color: theme.design.textOnDark,
    },
  });
