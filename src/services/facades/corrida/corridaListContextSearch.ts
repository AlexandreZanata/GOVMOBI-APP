/**
 * @fileoverview List, contexto, corrida ativa, Mapbox search.
 */
import type {Corrida} from '@models/Corrida';
import type {
  CorridaContexto,
  MapboxGeocodingResponse,
  SearchResult,
} from '../../../types';
import type {FacadeError, Result} from '../types';
import {fail, ok, toError} from './corridaResult';
import {corridaGetCorrida} from './corridaGetCorrida';
import {normalizeCorrida, normalizeStatus} from './corridaNormalize';
import type {CorridasPage, RawCorrida, RawCorridaListItem} from './corridaTypes';

export async function corridaListCorridas(
  apiBaseUrl: string,
  authHeaders: () => Record<string, string>,
  page: number,
  limit: number,
): Promise<Result<CorridasPage, FacadeError>> {
  try {
    const response = await fetch(
      `${apiBaseUrl}/corridas?page=${page}&limit=${limit}`,
      {headers: authHeaders()},
    );
    if (!response.ok) return fail(toError('Request failed', 'NETWORK_ERROR', response.status));
    const raw = (await response.json()) as {
      data: RawCorridaListItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    return ok({
      data: raw.data.map(item => ({
        id: item.id,
        passageiroId: item.passageiroId,
        motoristaId: item.motoristaId,
        veiculoId: item.veiculoId ?? null,
        origemLat: item.origem.lat,
        origemLng: item.origem.lng,
        origemEndereco: item.origem.endereco,
        destinoLat: item.destino.lat,
        destinoLng: item.destino.lng,
        destinoEndereco: item.destino.endereco,
        status: normalizeStatus(item.status),
        motivoServico: item.motivoServico ?? '',
        distanciaMetros: item.distanciaMetros ?? undefined,
        duracaoSegundos: item.duracaoSegundos ?? undefined,
        timestamps: item.timestamps,
        motorista: item.motorista,
        veiculo: item.veiculo,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      total: raw.total,
      page: raw.page,
      limit: raw.limit,
      totalPages: raw.totalPages,
    });
  } catch {
    return fail(toError('Network error', 'NETWORK_ERROR'));
  }
}

export async function corridaGetContexto(
  apiBaseUrl: string,
  authHeaders: () => Record<string, string>,
): Promise<Result<CorridaContexto, FacadeError>> {
  try {
    const response = await fetch(`${apiBaseUrl}/corridas/contexto`, {
      headers: authHeaders(),
    });
    if (!response.ok) {
      console.warn('[CorridaFacade] getContexto HTTP', response.status);
      return fail(toError('Unable to fetch corrida context', 'NETWORK_ERROR', response.status));
    }
    const raw = (await response.json()) as {
      usuario: {id: string; email: string; papeis: string[]; nome: string};
      corridaAtiva: {
        id: string;
        status: string;
        origem: {lat: number; lng: number};
        destino: {lat: number; lng: number};
        motoristaId: string | null;
        veiculoId?: string | null;
        passageiroId: string;
      } | null;
    };

    console.log('[CorridaFacade] getContexto corridaAtiva →', JSON.stringify(raw.corridaAtiva));

    let corridaAtiva: Corrida | null = null;
    if (raw.corridaAtiva) {
      const full = await corridaGetCorrida(apiBaseUrl, authHeaders, raw.corridaAtiva.id);
      if (full.data) {
        corridaAtiva = full.data;
      } else {
        console.warn(
          '[CorridaFacade] getContexto GET /corridas/:id failed — using minimal context',
          full.error?.message,
        );
        corridaAtiva = {
          id: raw.corridaAtiva.id,
          passageiroId: raw.corridaAtiva.passageiroId,
          motoristaId: raw.corridaAtiva.motoristaId,
          veiculoId: raw.corridaAtiva.veiculoId ?? null,
          origemLat: raw.corridaAtiva.origem.lat,
          origemLng: raw.corridaAtiva.origem.lng,
          destinoLat: raw.corridaAtiva.destino.lat,
          destinoLng: raw.corridaAtiva.destino.lng,
          status: normalizeStatus(raw.corridaAtiva.status),
          motivoServico: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    }

    return ok({usuario: raw.usuario, corridaAtiva});
  } catch (err) {
    console.error('[CorridaFacade] getContexto EXCEPTION →', err);
    return fail(toError('Network error while fetching corrida context', 'NETWORK_ERROR'));
  }
}

export async function corridaGetActiveCorrida(
  apiBaseUrl: string,
  authHeaders: () => Record<string, string>,
): Promise<Result<Corrida | null, FacadeError>> {
  try {
    const response = await fetch(`${apiBaseUrl}/corridas/ativa`, {
      headers: authHeaders(),
    });
    if (response.status === 404) return ok(null);
    if (!response.ok) return fail(toError('Request failed', 'NETWORK_ERROR', response.status));

    const body = (await response.json()) as {corridaAtiva?: RawCorrida | null} | RawCorrida;

    const raw = 'corridaAtiva' in body
      ? (body as {corridaAtiva: RawCorrida | null}).corridaAtiva
      : (body as RawCorrida);

    if (!raw) return ok(null);
    return ok(normalizeCorrida(raw));
  } catch (err) {
    console.error('[CorridaFacade] getActiveCorrida EXCEPTION →', err);
    return fail(toError('Network error', 'NETWORK_ERROR'));
  }
}

export async function corridaSearchLocations(
  mapboxToken: string,
  query: string,
): Promise<Result<SearchResult[], FacadeError>> {
  if (!mapboxToken) return fail(toError('Mapbox token not configured', 'CONFIG_ERROR'));
  if (!query.trim()) return ok([]);
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=BR&limit=5&language=pt`;
    const response = await fetch(url);
    if (!response.ok) return fail(toError('Mapbox geocoding failed', 'NETWORK_ERROR'));
    const data = (await response.json()) as MapboxGeocodingResponse;
    return ok(data.features.map(f => ({
      id: f.id,
      placeName: f.text,
      address: f.place_name,
      coordinates: {latitude: f.center[1], longitude: f.center[0]},
    })));
  } catch {
    return fail(toError('Network error during location search', 'NETWORK_ERROR'));
  }
}
