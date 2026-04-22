/**
 * @fileoverview Custom hook for the AdminAvaliacoesScreen.
 *
 * Encapsulates fetch logic, loading state, error state, and retry.
 */
import {useCallback, useEffect, useState} from 'react';
import {useFacades} from '@services/facades';
import type {Avaliacao} from '@models/Avaliacao';
import type {FacadeError} from '@services/facades/types';

export interface AdminAvaliacoesState {
  avaliacoes: Avaliacao[];
  isLoading: boolean;
  error: FacadeError | null;
  retry: () => void;
}

/**
 * Fetches all avaliacoes via the AvaliacoesFacade and exposes retry state.
 *
 * @returns AdminAvaliacoesState — data, loading flag, error, and retry handler.
 */
export const useAdminAvaliacoes = (): AdminAvaliacoesState => {
  const {avaliacoesFacade} = useFacades();
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<FacadeError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);
      const result = await avaliacoesFacade.listAvaliacoes();
      if (cancelled) return;
      setIsLoading(false);
      if (result.error) {
        setError(result.error);
      } else {
        setAvaliacoes(result.data);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [avaliacoesFacade, retryCount]);

  const retry = useCallback(() => {
    setRetryCount(c => c + 1);
  }, []);

  return {avaliacoes, isLoading, error, retry};
};
