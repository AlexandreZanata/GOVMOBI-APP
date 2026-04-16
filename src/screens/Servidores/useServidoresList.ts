/**
 * @fileoverview Hook for the ServidoresListScreen.
 */
import {useCallback, useEffect, useMemo, useState} from 'react';
import {type Servidor} from '../../models';
import {useFacades} from '../../services/facades';
import {type ServidoresFilter} from '../../types/servidores';

export type AtivoFilter = 'all' | 'active' | 'inactive';

export interface ServidoresListState {
  /** Filtered list of servidores to render. */
  servidores: Servidor[];
  isLoading: boolean;
  isRefreshing: boolean;
  isError: boolean;
  /** Current search text. */
  search: string;
  setSearch: (text: string) => void;
  /** Active/inactive filter. */
  ativoFilter: AtivoFilter;
  setAtivoFilter: (filter: AtivoFilter) => void;
  /** Triggers a data refresh. */
  refresh: () => void;
}

/**
 * Encapsulates data-fetching and local filter logic for the Servidores list.
 *
 * @returns {@link ServidoresListState}
 */
export const useServidoresList = (): ServidoresListState => {
  const {servidoresFacade} = useFacades();
  const [all, setAll] = useState<Servidor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isError, setIsError] = useState(false);
  const [search, setSearch] = useState('');
  const [ativoFilter, setAtivoFilter] = useState<AtivoFilter>('all');

  const fetchData = useCallback(async (): Promise<void> => {
    const result = await servidoresFacade.listServidores();
    if (result.error) {
      setIsError(true);
      return;
    }
    setIsError(false);
    setAll(result.data);
  }, [servidoresFacade]);

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

  const servidores = useMemo<Servidor[]>(() => {
    const filter: ServidoresFilter = {
      search: search.trim().toLowerCase(),
      ativo: ativoFilter === 'all' ? undefined : ativoFilter === 'active',
    };

    return all.filter(s => {
      const matchesSearch =
        !filter.search ||
        s.nome.toLowerCase().includes(filter.search) ||
        s.email.toLowerCase().includes(filter.search);
      const matchesAtivo =
        filter.ativo === undefined || s.ativo === filter.ativo;
      return matchesSearch && matchesAtivo;
    });
  }, [all, search, ativoFilter]);

  return {
    servidores,
    isLoading,
    isRefreshing,
    isError,
    search,
    setSearch,
    ativoFilter,
    setAtivoFilter,
    refresh,
  };
};
