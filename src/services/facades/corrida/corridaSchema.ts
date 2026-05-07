/**
 * @fileoverview Zod schemas for Corrida API payloads.
 */
import {z} from 'zod';

export const rawCorridaParadaSchema = z.union([
  z.object({
    id: z.string().min(1).optional(),
    lat: z.number(),
    lng: z.number(),
    ordem: z.coerce.number(),
    status: z.union([z.enum(['pendente', 'chegou', 'pulada']), z.string()]).optional(),
    chegouEm: z.union([z.string(), z.null()]).optional(),
    puladaEm: z.union([z.string(), z.null()]).optional(),
  }),
  z.object({
    id: z.string().min(1).optional(),
    latitude: z.number(),
    longitude: z.number(),
    ordem: z.coerce.number(),
    status: z.union([z.enum(['pendente', 'chegou', 'pulada']), z.string()]).optional(),
    chegouEm: z.union([z.string(), z.null()]).optional(),
    puladaEm: z.union([z.string(), z.null()]).optional(),
  }),
]).transform(value => {
  const lat = 'lat' in value ? value.lat : value.latitude;
  const lng = 'lng' in value ? value.lng : value.longitude;
  const ordem = Math.max(0, Math.trunc(Number(value.ordem)));
  const raw = value.status;
  const lower = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  const status: 'pendente' | 'chegou' | 'pulada' =
    lower === 'chegou' || lower === 'pulada' || lower === 'pendente' ? lower : 'pendente';
  return {
    id: value.id ?? `parada-${ordem}`,
    lat,
    lng,
    ordem,
    status,
    chegouEm: value.chegouEm ?? null,
    puladaEm: value.puladaEm ?? null,
  };
});

const rawCoordinateSchema = z.union([
  z.object({
    lat: z.number(),
    lng: z.number(),
    endereco: z.string().optional(),
  }),
  z.object({
    latitude: z.number(),
    longitude: z.number(),
    endereco: z.string().optional(),
  }),
]).transform(value => ({
  lat: 'lat' in value ? value.lat : value.latitude,
  lng: 'lng' in value ? value.lng : value.longitude,
  endereco: value.endereco,
}));

export const rawCorridaSchema = z.object({
  id: z.string().min(1),
  passageiroId: z.string().optional(),
  motoristaId: z.string().nullable().optional(),
  veiculoId: z.string().nullable().optional(),
  status: z.string().min(1).optional(),
  motivoServico: z.string().optional(),
  observacoes: z.string().optional(),
  /** Backend may return null before a route is computed. */
  distanciaMetros: z.number().nullable().optional(),
  duracaoSegundos: z.number().nullable().optional(),
  canceladoPor: z.string().nullable().optional(),
  motivoCancelamento: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  origem: rawCoordinateSchema.optional(),
  destino: rawCoordinateSchema.optional(),
  origemLat: z.number().optional(),
  origemLng: z.number().optional(),
  destinoLat: z.number().optional(),
  destinoLng: z.number().optional(),
  timestamps: z.object({
    solicitadaEm: z.string().optional(),
    aceitaEm: z.string().optional(),
    iniciadaEm: z.string().optional(),
    embarqueEm: z.string().optional(),
    finalizadaEm: z.string().optional(),
    canceladaEm: z.string().optional(),
  }).optional(),
  motorista: z.object({
    id: z.string().optional(),
    servidorId: z.string().optional(),
    cnhCategoria: z.string().optional(),
    statusOperacional: z.string().optional(),
    notaMedia: z.number().optional(),
    totalAvaliacoes: z.number().optional(),
    fotoPerfilUrl: z.string().nullable().optional(),
  }).optional(),
  veiculo: z.object({
    id: z.union([z.string(), z.null()]).optional(),
    placa: z.string().optional(),
    modelo: z.string().optional(),
    ano: z.number().optional(),
    tipo: z.string().optional(),
  }).optional(),
  pontosParada: z.array(rawCorridaParadaSchema).optional(),
});
