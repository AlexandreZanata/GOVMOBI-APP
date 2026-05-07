/**
 * @fileoverview Builds a full ride polyline (origin → ordered stops → destination)
 * by chaining Mapbox-backed `/pesquisa/rota` segments.
 */
import type {Corrida} from '@models/Corrida';
import type {IPesquisaFacade} from '@services/facades/PesquisaFacade';

type LngLat = [number, number];

/**
 * Fetches road geometry for each leg and merges coordinates into one LineString.
 *
 * @param corrida - Ride with origin, destination, and optional `pontosParada`.
 * @param pesquisa - Facade for `/pesquisa/rota`.
 * @returns Merged `[lng, lat]` pairs, or empty array when routing fails.
 */
export async function fetchCorridaRouteCoordinates(
  corrida: Corrida,
  pesquisa: IPesquisaFacade,
): Promise<LngLat[]> {
  const stops = [...(corrida.pontosParada ?? [])].sort((a, b) => a.ordem - b.ordem);
  const legs: Array<{lat: number; lng: number}> = [
    {lat: corrida.origemLat, lng: corrida.origemLng},
    ...stops.map(s => ({lat: s.lat, lng: s.lng})),
    {lat: corrida.destinoLat, lng: corrida.destinoLng},
  ];
  if (legs.length < 2) return [];

  const merged: LngLat[] = [];
  for (let i = 0; i < legs.length - 1; i++) {
    const from = legs[i];
    const to = legs[i + 1];
    const result = await pesquisa.getRouteBetweenPoints({
      origemLat: from.lat,
      origemLng: from.lng,
      destinoLat: to.lat,
      destinoLng: to.lng,
    });
    const seg = result.data?.geometry.coordinates as LngLat[] | undefined;
    if (!seg || seg.length < 2) continue;
    if (merged.length === 0) {
      merged.push(...seg);
    } else {
      merged.push(...seg.slice(1));
    }
  }
  return merged;
}
