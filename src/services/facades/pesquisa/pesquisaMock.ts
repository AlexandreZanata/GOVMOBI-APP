/**
 * @fileoverview Mock delay and sample data for Pesquisa facade (MOCK_MODE).
 */
import type {GetRouteInput, GeocodingResult, PesquisaRouteResult} from '../../../types/pesquisa';

export const pesquisaDelay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export const mockGeocodingResults = (query: string): GeocodingResult[] => [
  {
    address: query,
    placeName: `Rua ${query}, Goiânia - Goiás, Brasil`,
    lat: -16.6869 + Math.random() * 0.01,
    lng: -49.2648 + Math.random() * 0.01,
  },
  {
    address: query,
    placeName: `Avenida ${query}, Aparecida de Goiânia - Goiás, Brasil`,
    lat: -16.8234 + Math.random() * 0.01,
    lng: -49.2437 + Math.random() * 0.01,
  },
  {
    address: query,
    placeName: `${query}, Brasília - DF, Brasil`,
    lat: -15.7801 + Math.random() * 0.01,
    lng: -47.9292 + Math.random() * 0.01,
  },
];

export const mockRouteResult = (input: GetRouteInput): PesquisaRouteResult => {
  const midLng = (input.origemLng + input.destinoLng) / 2;
  const midLat = (input.origemLat + input.destinoLat) / 2;
  const distance = Math.hypot(
    input.destinoLat - input.origemLat,
    input.destinoLng - input.origemLng,
  );

  return {
    geometry: {
      type: 'LineString',
      coordinates: [
        [input.origemLng, input.origemLat],
        [midLng, midLat],
        [input.destinoLng, input.destinoLat],
      ],
    },
    distanciaMetros: Math.max(120, Math.round(distance * 111_000)),
    duracaoSegundos: Math.max(60, Math.round(distance * 7_200)),
  };
};
