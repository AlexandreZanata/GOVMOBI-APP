/**
 * @fileoverview VeiculoAssociationScreen — driver vehicle association screen.
 *
 * Allows the driver to associate or disassociate a vehicle for their shift.
 * Calls GET /frota/veiculos (filtered to ativo=true) and GET /frota/motoristas/me/veiculo on mount.
 */
/* eslint-disable react-native/no-unused-styles */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {MaterialIcons} from '@expo/vector-icons';
import {useTheme, type Theme} from '../../theme';
import {useFacades} from '@services/facades';
import type {Veiculo} from '../../models';

// eslint-disable-next-line react-native/no-unused-styles
const createStyles = (theme: Theme, paddingTop: number) =>
  StyleSheet.create({    root: {
      flex: 1,
      backgroundColor: theme.design.surface200,
      paddingTop,
    },
    header: {
      backgroundColor: theme.design.navy800,
      padding: theme.spacing[5],
      paddingBottom: theme.spacing[4],
    },
    headerTitle: {
      ...theme.typography.scale.displayMd,
      color: theme.design.textOnDark,
    },
    content: {
      flex: 1,
      padding: theme.spacing[4],
    },
    label: {
      ...theme.typography.scale.labelMd,
      color: theme.design.textSecondary,
      marginBottom: theme.spacing[3],
    },
    vehicleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.design.surface100,
      borderRadius: theme.borderRadius.radius.md,
      padding: theme.spacing[4],
      marginBottom: theme.spacing[2],
      borderWidth: 2,
      borderColor: 'transparent',
    },
    vehicleItemSelected: {
      borderColor: theme.colors.primary,
    },
    vehicleInfo: {
      flex: 1,
    },
    vehicleName: {
      ...theme.typography.scale.headingSm,
      color: theme.design.textPrimary,
    },
    vehiclePlate: {
      ...theme.typography.scale.bodyMd,
      color: theme.design.textSecondary,
    },
    emptyText: {
      ...theme.typography.scale.bodyMd,
      color: theme.design.textTertiary,
      textAlign: 'center',
      marginTop: theme.spacing[8],
    },
    actions: {
      padding: theme.spacing[4],
      gap: theme.spacing[3],
    },
    btn: {
      borderRadius: theme.borderRadius.radius.md,
      paddingVertical: theme.spacing[4],
      alignItems: 'center',
    },
    btnPrimary: {
      backgroundColor: theme.colors.primary,
    },
    btnDanger: {
      backgroundColor: theme.colors.error,
    },
    btnDisabled: {
      opacity: 0.4,
    },
    btnText: {
      ...theme.typography.scale.labelLg,
      color: theme.design.textOnDark,
    },
  });

export const VeiculoAssociationScreen = (): React.JSX.Element => {
  const {t} = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {frotaFacade} = useFacades();

  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [currentVeiculoId, setCurrentVeiculoId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);

  const styles = useMemo(() => createStyles(theme, insets.top), [theme, insets.top]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [veiculosResult, myVehicleResult] = await Promise.all([
        frotaFacade.listVeiculos(),
        frotaFacade.getMyVehicle(),
      ]);
      if (!veiculosResult.error && veiculosResult.data) {
        setVeiculos(veiculosResult.data.filter(v => v.ativo));
      }
      if (!myVehicleResult.error && myVehicleResult.data) {
        setCurrentVeiculoId(myVehicleResult.data.id);
        setSelectedId(myVehicleResult.data.id);
      }
      setIsLoading(false);
    };
    void load();
  }, [frotaFacade]);

  const handleAssociate = useCallback(async () => {
    if (!selectedId) return;
    setIsActing(true);
    const result = await frotaFacade.associateVehicle(selectedId);
    setIsActing(false);
    if (result.error) {
      if (result.error.code === 'CONFLICT') {
        Alert.alert(t('motorista.veiculo.conflictError'));
      } else {
        Alert.alert(t('errors.unknownError'));
      }
      return;
    }
    setCurrentVeiculoId(selectedId);
    Alert.alert(t('motorista.veiculo.successAssociated'));
  }, [selectedId, frotaFacade, t]);

  const handleDisassociate = useCallback(async () => {
    setIsActing(true);
    const result = await frotaFacade.disassociateVehicle();
    setIsActing(false);
    if (result.error) {
      if (result.error.code === 'CONFLICT') {
        Alert.alert(t('motorista.veiculo.disassociateConflict'));
      } else {
        Alert.alert(t('errors.unknownError'));
      }
      return;
    }
    setCurrentVeiculoId(null);
    setSelectedId(null);
    Alert.alert(t('motorista.veiculo.successDisassociated'));
  }, [frotaFacade, t]);

  const renderVeiculo: ListRenderItem<Veiculo> = useCallback(
    ({item}) => (
      <Pressable
        accessibilityLabel={`${item.modelo} ${item.placa}`}
        accessibilityRole="radio"
        accessibilityState={{selected: selectedId === item.id}}
        key={item.id}
        onPress={() => setSelectedId(item.id)}
        style={[styles.vehicleItem, selectedId === item.id && styles.vehicleItemSelected]}
        testID={`veiculo-item-${item.id}`}>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>{item.modelo}</Text>
          <Text style={styles.vehiclePlate}>{item.placa} · {item.ano}</Text>
        </View>
        {selectedId === item.id && (
          <MaterialIcons color={theme.colors.primary} name="check-circle" size={24} />
        )}
      </Pressable>
    ),
    [selectedId, styles, theme.colors.primary],
  );

  if (isLoading) {
    return (
      <View style={[styles.root, {alignItems: 'center', justifyContent: 'center'}]} testID="veiculo-loading">
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root} testID="veiculo-association-screen">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('motorista.veiculo.title')}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>{t('motorista.veiculo.selectLabel')}</Text>
        {veiculos.length === 0 ? (
          <Text style={styles.emptyText}>{t('motorista.veiculo.noVehicles')}</Text>
        ) : (
          <FlatList
            data={veiculos}
            keyExtractor={item => item.id}
            renderItem={renderVeiculo}
            testID="veiculos-list"
          />
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={t('motorista.veiculo.associateBtn')}
          accessibilityRole="button"
          disabled={!selectedId || isActing}
          onPress={() => void handleAssociate()}
          style={[styles.btn, styles.btnPrimary, (!selectedId || isActing) && styles.btnDisabled]}
          testID="associate-btn">
          {isActing ? (
            <ActivityIndicator color={theme.design.textOnDark} size="small" />
          ) : (
            <Text style={styles.btnText}>{t('motorista.veiculo.associateBtn')}</Text>
          )}
        </Pressable>

        {currentVeiculoId && (
          <Pressable
            accessibilityLabel={t('motorista.veiculo.disassociateBtn')}
            accessibilityRole="button"
            disabled={isActing}
            onPress={() => void handleDisassociate()}
            style={[styles.btn, styles.btnDanger, isActing && styles.btnDisabled]}
            testID="disassociate-btn">
            <Text style={styles.btnText}>{t('motorista.veiculo.disassociateBtn')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

VeiculoAssociationScreen.displayName = 'VeiculoAssociationScreen';
