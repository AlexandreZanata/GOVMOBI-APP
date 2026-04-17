/**
 * @fileoverview Hook for the FrotaScreen (veículos + motoristas tabs).
 */
import {useCallback, useEffect, useState} from 'react';
import {type Motorista, type Veiculo} from '../../models';
import {useFacades} from '@services/facades';
import {type AtivoFilter} from '../Servidores/useServidoresList';
import {type MotoristaStatusOperacional} from '@models/Motorista';

export type FrotaTab = 'veiculos' | 'motoristas';

export interface FrotaState {
  activeTab: FrotaTab;
  setActiveTab: (tab: FrotaTab) => void;
  veiculos: Veiculo[];
  motoristas: Motorista[];
  isLoading: boolean;
  isRefreshing: boolean;
  isError: boolean;
  veiculoFilter: AtivoFilter;
  setVeiculoFilter: (f: AtivoFilter) => void;
  motoristaStatusFilter: MotoristaStatusOperacional | 'all';
  setMotoristaStatusFilter: (f: MotoristaStatusOperacional | 'all') => void;
  refresh: () => void;
}

/**
 * Loads veículos and motoristas, exposes tab and filter state.
 *
 * @returns {@link FrotaState}
 */
export const useFrota = (): FrotaState => {
  const {frotaFacade} = useFacades();
  const [activeTab, setActiveTab] = useState<FrotaTab>('veiculos');
  const [allVeiculos, setAllVeiculos] = useState<Veiculo[]>([]);
  const [allMotoristas, setAllMotoristas] = useState<Motorista[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isError, setIsError] = useState(false);
  const [veiculoFilter, setVeiculoFilter] = useState<AtivoFilter>('all');
  const [motoristaStatusFilter, setMotoristaStatusFilter] = useState<
    MotoristaStatusOperacional | 'all'
  >('all');

  const fetchData = useCallback(async (): Promise<void> => {
    const [vResult, mResult] = await Promise.all([
      frotaFacade.listVeiculos(),
      frotaFacade.listMotoristas(),
    ]);
    if (vResult.error || mResult.error) {
      setIsError(true);
      return;
    }
    setIsError(false);
    setAllVeiculos(vResult.data);
    setAllMotoristas(mResult.data);
  }, [frotaFacade]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      await fetchData();
      if (!cancelled) setIsLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  const refresh = useCallback((): void => {
    setIsRefreshing(true);
    fetchData().then(() => setIsRefreshing(false));
  }, [fetchData]);

  const veiculos = allVeiculos.filter(v => {
    if (veiculoFilter === 'active') return v.ativo;
    if (veiculoFilter === 'inactive') return !v.ativo;
    return true;
  });

  const motoristas = allMotoristas.filter(m => {
    if (motoristaStatusFilter !== 'all') {
      return m.statusOperacional === motoristaStatusFilter;
    }
    return true;
  });

  return {
    activeTab,
    setActiveTab,
    veiculos,
    motoristas,
    isLoading,
    isRefreshing,
    isError,
    veiculoFilter,
    setVeiculoFilter,
    motoristaStatusFilter,
    setMotoristaStatusFilter,
    refresh,
  };
};
