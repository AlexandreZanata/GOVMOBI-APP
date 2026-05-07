/**
 * @fileoverview Normalize backend corrida payloads into domain model.
 */
import type {Corrida} from '@models/Corrida';
import type {RawCorrida} from './corridaTypes';

/**
 * Maps the backend's status enum values to the app's CorridaStatus union.
 * Handles both lowercase (backend) and uppercase (app) variants.
 */
export const normalizeStatus = (status: string): Corrida['status'] => {
  switch (status.trim().toLowerCase()) {
    case 'solicitada':       return 'solicitada';
    case 'aguardando_aceite': return 'aguardando_aceite';
    case 'aceita':           return 'aceita';
    case 'recusada':         return 'cancelada';
    case 'em_rota':
    case 'em_deslocamento':  return 'em_rota';
    case 'passageiro_embarcado':
    case 'passageiro_a_bordo':   return 'passageiro_a_bordo';
    case 'concluida':
    case 'finalizada':       return 'concluida';
    case 'avaliada':         return 'avaliada';
    case 'cancelada':        return 'cancelada';
    case 'expirada':         return 'expirada';
    default:                 return 'solicitada';
  }
};

/**
 * Normalizes a raw backend corrida response into the app's Corrida model.
 *
 * @param raw - Raw response from any corrida lifecycle endpoint.
 * @returns Normalized Corrida with guaranteed numeric coordinates.
 */
export const normalizeCorrida = (raw: RawCorrida): Corrida => ({
  id: raw.id,
  passageiroId: raw.passageiroId ?? '',
  motoristaId: raw.motoristaId ?? null,
  veiculoId: raw.veiculoId ?? null,
  origemLat: raw.origemLat ?? raw.origem?.lat ?? 0,
  origemLng: raw.origemLng ?? raw.origem?.lng ?? 0,
  origemEndereco: raw.origem?.endereco,
  destinoLat: raw.destinoLat ?? raw.destino?.lat ?? 0,
  destinoLng: raw.destinoLng ?? raw.destino?.lng ?? 0,
  destinoEndereco: raw.destino?.endereco,
  status: normalizeStatus(raw.status ?? 'solicitada'),
  motivoServico: raw.motivoServico ?? '',
  observacoes: raw.observacoes,
  distanciaMetros: raw.distanciaMetros,
  duracaoSegundos: raw.duracaoSegundos,
  timestamps: raw.timestamps,
  motorista: raw.motorista,
  veiculo: raw.veiculo,
  pontosParada: raw.pontosParada,
  createdAt: raw.createdAt ?? new Date().toISOString(),
  updatedAt: raw.updatedAt ?? new Date().toISOString(),
});

/**
 * Unwraps common API envelopes and normalizes `paradas` → `pontosParada`.
 */
export function unwrapCorridaRecord(payload: unknown): unknown {
  if (typeof payload !== 'object' || payload === null) return payload;
  const root = payload as Record<string, unknown>;
  let cur: unknown = root['data'] ?? root['corrida'] ?? root['corridaAtiva'] ?? payload;

  if (typeof cur === 'object' && cur !== null) {
    const layer = cur as Record<string, unknown>;
    const hasId = typeof layer['id'] === 'string';
    if (!hasId) {
      const nested = layer['data'] ?? layer['corrida'];
      if (
        typeof nested === 'object' &&
        nested !== null &&
        typeof (nested as Record<string, unknown>)['id'] === 'string'
      ) {
        cur = nested;
      }
    }
  }

  if (typeof cur !== 'object' || cur === null) return cur;
  const obj = {...(cur as Record<string, unknown>)};
  if (!obj['pontosParada'] && Array.isArray(obj['paradas'])) {
    obj['pontosParada'] = obj['paradas'];
  }
  return obj;
}
