/**
 * @fileoverview Hook for the ServidorDetailScreen.
 */
import {useEffect, useState} from 'react';
import {type Servidor} from '../../models';
import {useFacades} from '../../services/facades';

export interface ServidorDetailState {
  servidor: Servidor | null;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Fetches a single servidor by ID for the detail screen.
 *
 * @param servidorId - UUID of the servidor to load.
 * @returns {@link ServidorDetailState}
 */
export const useServidorDetail = (servidorId: string): ServidorDetailState => {
  const {servidoresFacade} = useFacades();
  const [servidor, setServidor] = useState<Servidor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      const result = await servidoresFacade.getServidorById({id: servidorId});
      if (cancelled) return;
      if (result.error) {
        setIsError(true);
      } else {
        setServidor(result.data);
      }
      setIsLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [servidorId, servidoresFacade]);

  return {servidor, isLoading, isError};
};
