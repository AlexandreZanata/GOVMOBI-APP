/**
 * @fileoverview Mock implementation of ICorridaFacade for MOCK_MODE.
 *
 * Simulates the full corrida lifecycle with realistic latency.
 * State is held in-memory — resets on app restart.
 */
import type {Corrida, CorridaMensagem, CorridaStatus} from '@models/Corrida';
import type {
  SolicitarCorridaInput,
  SolicitarCorridaResponse,
  AceitarCorridaInput,
  RecusarCorridaInput,
  ConfirmarEmbarqueInput,
  FinalizarCorridaInput,
  CancelarCorridaInput,
  CorridaStatusResponse,
  CreateCorridaInput,
  SearchResult,
} from '../../../types';
import type {ICorridaFacade} from '../CorridaFacade';
import type {FacadeError, Result} from '../types';
import type {CorridaContexto} from '../../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T>(error: FacadeError): Result<T, FacadeError> => ({data: null, error});
const toError = (message: string, code = 'INTERNAL_ERROR'): FacadeError => ({code, message});
const delay = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));
const uuid = (): string => `mock-${Math.random().toString(36).slice(2, 10)}`;

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

const store = new Map<string, Corrida>();
const mensagensStore = new Map<string, CorridaMensagem[]>();

const seedMensagens = (corridaId: string): CorridaMensagem[] => [
  {
    id: uuid(),
    corridaId,
    remetenteId: 'motorista-mock-001',
    conteudo: 'Estou a caminho!',
    createdAt: new Date(Date.now() - 60_000).toISOString(),
  },
  {
    id: uuid(),
    corridaId,
    remetenteId: 'passageiro-mock-001',
    conteudo: 'Ok, aguardando.',
    createdAt: new Date(Date.now() - 30_000).toISOString(),
  },
];

const makeCorrida = (
  input: SolicitarCorridaInput,
  status: CorridaStatus = 'SOLICITADA',
): Corrida => ({
  id: uuid(),
  passageiroId: input.passageiroId || 'passageiro-mock-001',
  motoristaId: null,
  veiculoId: null,
  origemLat: input.origemLat,
  origemLng: input.origemLng,
  destinoLat: input.destinoLat,
  destinoLng: input.destinoLng,
  motivoServico: input.motivoServico,
  observacoes: input.observacoes,
  status,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const transition = (corrida: Corrida, status: CorridaStatus, patch?: Partial<Corrida>): Corrida => ({
  ...corrida,
  ...patch,
  status,
  updatedAt: new Date().toISOString(),
});

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

/**
 * In-memory mock for the corrida facade.
 * Simulated latency: 200–400ms per operation.
 */
export class CorridaFacadeMock implements ICorridaFacade {
  /** @inheritdoc */
  public async solicitarCorrida(
    input: SolicitarCorridaInput,
  ): Promise<Result<SolicitarCorridaResponse, FacadeError>> {
    await delay(300);
    const corrida = makeCorrida(input);
    store.set(corrida.id, corrida);
    return ok({corridaId: corrida.id, status: 'SOLICITADA'});
  }

  /** @inheritdoc */
  public async createCorrida(
    input: CreateCorridaInput,
  ): Promise<Result<SolicitarCorridaResponse, FacadeError>> {
    return this.solicitarCorrida({
      passageiroId: 'passageiro-mock-001',
      origemLat: input.origem.latitude,
      origemLng: input.origem.longitude,
      destinoLat: input.destino.latitude,
      destinoLng: input.destino.longitude,
      motivoServico: input.origem.endereco,
    });
  }

  /** @inheritdoc */
  public async aceitarCorrida(
    corridaId: string,
    input: AceitarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    await delay(250);
    const corrida = store.get(corridaId);
    if (!corrida) return fail(toError('Corrida not found', 'NOT_FOUND'));
    if (corrida.status !== 'SOLICITADA') return fail(toError('Corrida já aceita', 'CONFLICT'));
    const updated = transition(corrida, 'ACEITA', {
      motoristaId: input.motoristaId,
      veiculoId: input.veiculoId,
    });
    store.set(corridaId, updated);
    mensagensStore.set(corridaId, seedMensagens(corridaId));
    return ok(updated);
  }

  /** @inheritdoc */
  public async recusarCorrida(
    corridaId: string,
    _input: RecusarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    await delay(200);
    const corrida = store.get(corridaId);
    if (!corrida) return fail(toError('Corrida not found', 'NOT_FOUND'));
    const updated = transition(corrida, 'RECUSADA');
    store.set(corridaId, updated);
    return ok(updated);
  }

  /** @inheritdoc */
  public async iniciarDeslocamento(
    corridaId: string,
  ): Promise<Result<Corrida, FacadeError>> {
    await delay(200);
    const corrida = store.get(corridaId);
    if (!corrida) return fail(toError('Corrida not found', 'NOT_FOUND'));
    const updated = transition(corrida, 'EM_DESLOCAMENTO');
    store.set(corridaId, updated);
    return ok(updated);
  }

  /** @inheritdoc */
  public async confirmarEmbarque(
    corridaId: string,
    _input: ConfirmarEmbarqueInput,
  ): Promise<Result<Corrida, FacadeError>> {
    await delay(200);
    const corrida = store.get(corridaId);
    if (!corrida) return fail(toError('Corrida not found', 'NOT_FOUND'));
    const updated = transition(corrida, 'PASSAGEIRO_EMBARCADO');
    store.set(corridaId, updated);
    return ok(updated);
  }

  /** @inheritdoc */
  public async finalizarCorrida(
    corridaId: string,
    _input: FinalizarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    await delay(250);
    const corrida = store.get(corridaId);
    if (!corrida) return fail(toError('Corrida not found', 'NOT_FOUND'));
    const updated = transition(corrida, 'FINALIZADA');
    store.set(corridaId, updated);
    return ok(updated);
  }

  /** @inheritdoc */
  public async cancelarCorrida(
    corridaId: string,
    _input: CancelarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> {
    await delay(200);
    const corrida = store.get(corridaId);
    if (!corrida) return fail(toError('Corrida not found', 'NOT_FOUND'));
    if (corrida.status === 'FINALIZADA') {
      return fail(toError('Corrida já finalizada', 'BAD_REQUEST'));
    }
    const updated = transition(corrida, 'CANCELADA');
    store.set(corridaId, updated);
    return ok(updated);
  }

  /** @inheritdoc */
  public async getCorrida(
    corridaId: string,
  ): Promise<Result<Corrida, FacadeError>> {
    await delay(150);
    const corrida = store.get(corridaId);
    if (!corrida) return fail(toError('Corrida not found', 'NOT_FOUND'));
    return ok(corrida);
  }

  /** @inheritdoc */
  public async getCorridaStatus(
    corridaId: string,
  ): Promise<Result<CorridaStatusResponse, FacadeError>> {
    await delay(80);
    const corrida = store.get(corridaId);
    if (!corrida) return fail(toError('Corrida not found', 'NOT_FOUND'));
    return ok({id: corridaId, status: corrida.status});
  }

  /** @inheritdoc */
  public async getMensagens(
    corridaId: string,
  ): Promise<Result<CorridaMensagem[], FacadeError>> {
    await delay(150);
    const msgs = mensagensStore.get(corridaId) ?? [];
    return ok(msgs);
  }

  /** @inheritdoc */
  public async searchLocations(
    query: string,
  ): Promise<Result<SearchResult[], FacadeError>> {
    await delay(300);
    if (!query.trim()) return ok([]);
    return ok([
      {
        id: `mock-1-${query}`,
        placeName: `Rua ${query}`,
        address: `Rua ${query}, Goiânia - GO, Brasil`,
        coordinates: {latitude: -16.6869, longitude: -49.2648},
      },
      {
        id: `mock-2-${query}`,
        placeName: `Avenida ${query}`,
        address: `Avenida ${query}, Brasília - DF, Brasil`,
        coordinates: {latitude: -15.7801, longitude: -47.9292},
      },
    ]);
  }

  /** @inheritdoc */
  public async cancelCorrida(
    corridaId: string,
    reason: string,
  ): Promise<Result<boolean, FacadeError>> {
    const result = await this.cancelarCorrida(corridaId, {
      solicitanteId: 'passageiro-mock-001',
      motivo: reason,
      tipoSolicitante: 'passageiro',
    });
    if (result.error) return fail(result.error);
    return ok(true);
  }

  /** @inheritdoc */
  public async getActiveCorrida(): Promise<Result<Corrida | null, FacadeError>> {
    await delay(150);
    const active = [...store.values()].find(
      c => c.status !== 'FINALIZADA' && c.status !== 'CANCELADA' && c.status !== 'RECUSADA',
    );
    return ok(active ?? null);
  }

  /** @inheritdoc */
  public async getContexto(): Promise<Result<CorridaContexto, FacadeError>> {
    await delay(150);
    const active = [...store.values()].find(
      c => c.status !== 'FINALIZADA' && c.status !== 'CANCELADA' && c.status !== 'RECUSADA',
    );
    return ok({
      usuario: {
        id: 'passageiro-mock-001',
        email: 'mock@govmob.gov.br',
        papeis: ['USUARIO'],
        nome: 'Mock User',
      },
      corridaAtiva: active ?? null,
    });
  }
}
