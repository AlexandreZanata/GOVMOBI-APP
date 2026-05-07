/**
 * @fileoverview Loads merged road geometry for an active corrida (with optional stops).
 */
import {useEffect, useMemo, useRef, useState} from 'react';
import type {Corrida} from '@models/Corrida';
import {useFacades} from '@services/facades';
import {fetchCorridaRouteCoordinates} from '@services/routing/corridaRouteGeometry';

function geometryKey(c: Corrida): string {
  const stops = [...(c.pontosParada ?? [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map(p => `${p.id}:${p.ordem}:${p.lat}:${p.lng}:${p.status}`)
    .join(';');
  return [c.id, c.origemLat, c.origemLng, c.destinoLat, c.destinoLng, stops].join('|');
}

/**
 * @param corrida - Current ride; coordinates must be finite.
 * @param enabled - When false, clears geometry and skips network.
 * @returns Merged route coordinates and loading flag.
 */
export function useCorridaRoutePolyline(
  corrida: Corrida | null,
  enabled: boolean,
): {coordinates: [number, number][]; isLoading: boolean} {
  const {pesquisaFacade} = useFacades();
  const [coordinates, setCoordinates] = useState<[number, number][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const requestRef = useRef(0);
  const key = useMemo(() => (corrida ? geometryKey(corrida) : ''), [corrida]);

  useEffect(() => {
    if (
      !enabled ||
      !corrida ||
      !key ||
      !Number.isFinite(corrida.origemLat) ||
      !Number.isFinite(corrida.origemLng) ||
      !Number.isFinite(corrida.destinoLat) ||
      !Number.isFinite(corrida.destinoLng)
    ) {
      setCoordinates([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    const req = ++requestRef.current;
    setIsLoading(true);
    void (async () => {
      const coords = await fetchCorridaRouteCoordinates(corrida, pesquisaFacade);
      if (cancelled || req !== requestRef.current) return;
      setCoordinates(coords);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [corrida, enabled, key, pesquisaFacade]);

  return {coordinates, isLoading};
}
