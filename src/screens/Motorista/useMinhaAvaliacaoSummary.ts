/**
 * @fileoverview Custom hook for the MinhaNotaScreen.
 *
 * Encapsulates fetch logic, loading state, error state, and retry.
 */
import {useCallback, useEffect, useState} from 'react';
import {useFacades} from '@services/facades';
import type {AvaliacaoSummary} from '@models/Avaliacao';
import type {FacadeError} from '@services/facades/types';

export interface MinhaAvaliacaoSummaryState {
  summary: AvaliacaoSummary | null;
  isLoading: boolean;
  error: FacadeError | null;
  retry: () => void;
}

/**
 * Fetches the authenticated driver's rating summary via the AvaliacoesFacade.
 *
 * @returns MinhaAvaliacaoSummaryState — data, loading flag, error, and retry handler.
 */
export const useMinhaAvaliacaoSummary = (): MinhaAvaliacaoSummaryState => {
  const {avaliacoesFacade} = useFacades();
  const [summary, setSummary] = useState<AvaliacaoSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<FacadeError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);
      const result = await avaliacoesFacade.getMinhaAvaliacaoSummary();
      if (cancelled) return;
      setIsLoading(false);
      if (result.error) {
        setError(result.error);
      } else {
        setSummary(result.data);
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

  return {summary, isLoading, error, retry};
};
