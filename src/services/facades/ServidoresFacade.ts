/**
 * @fileoverview Facade contract and implementation for the Servidores domain.
 * API: GET /servidores, GET /servidores/:id
 *      PATCH /servidores/me/foto-perfil
 *      PATCH /servidores/:id/foto-perfil  (Admin only)
 * Response envelope: { success, data, timestamp } — .data is unwrapped here.
 */
import {type Servidor} from '../../models';
import {type GetServidorByIdInput} from '../../types/servidores';
import {type FacadeConfig, type FacadeError, type Result} from './types';
import {ENV} from '../../config/env';
import {resolvePublicMediaUrl} from '@utils/resolvePublicMediaUrl';

/** Response from PATCH /servidores/me/foto-perfil */
export interface FotoPerfilResponse {
  fotoPerfilUrl: string;
}

/** Input for uploading a profile photo as a local file URI. */
export interface UploadFotoPerfilInput {
  /** Local file URI from expo-image-picker (e.g. file:///...) */
  uri: string;
  /** MIME type: image/jpeg | image/png | image/webp */
  mimeType: string;
  /** Original file name */
  fileName: string;
}

/** Mock fixture data used when MOCK_MODE is enabled. */
const MOCK_SERVIDORES: Servidor[] = [
  {
    id: 'srv-1',
    nome: 'João Vitor Flávio Pinto',
    cpf: '04673024133',
    email: 'jvflaviopinto@gov.br',
    telefone: '66974002072',
    cargoId: 'cargo-1',
    lotacaoId: 'lot-1',
    papeis: ['USUARIO', 'MOTORISTA'],
    ativo: true,
    createdAt: '2026-04-15T14:18:02.629Z',
    updatedAt: '2026-04-15T14:18:02.629Z',
    deletedAt: null,
  },
  {
    id: 'srv-2',
    nome: 'Ana Paula Souza',
    cpf: '98765432100',
    email: 'ana.souza@gov.br',
    telefone: '21977776666',
    cargoId: 'cargo-2',
    lotacaoId: 'lot-2',
    papeis: ['USUARIO'],
    ativo: true,
    createdAt: '2026-04-10T10:00:00.000Z',
    updatedAt: '2026-04-10T10:00:00.000Z',
    deletedAt: null,
  },
  {
    id: 'srv-3',
    nome: 'Roberto Lima Carvalho',
    cpf: '11122233344',
    email: 'r.lima@gov.br',
    telefone: '11988881234',
    cargoId: 'cargo-1',
    lotacaoId: 'lot-1',
    papeis: ['ADMIN'],
    ativo: false,
    createdAt: '2026-03-01T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
    deletedAt: '2026-04-01T08:00:00.000Z',
  },
];

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T>(error: FacadeError): Result<T, FacadeError> => ({data: null, error});

/**
 * Facade contract for servidor operations used by the mobile app.
 */
export interface IServidoresFacade {
  /**
   * Returns all servidores (active and inactive).
   * @returns Result wrapping Servidor array or a FacadeError.
   */
  listServidores(): Promise<Result<Servidor[], FacadeError>>;

  /**
   * Returns a single servidor by ID.
   * @param input - Object containing the servidor UUID.
   * @returns Result wrapping Servidor or a FacadeError with code NOT_FOUND.
   */
  getServidorById(input: GetServidorByIdInput): Promise<Result<Servidor, FacadeError>>;

  /**
   * Uploads a profile photo for the authenticated user.
   * PATCH /servidores/me/foto-perfil
   * Accepts JPEG, PNG, WebP — max 5MB. Backend resizes to 400×400 WebP.
   *
   * @param input - Local file URI, MIME type, and file name.
   * @returns Result wrapping the new CDN URL or a FacadeError.
   */
  uploadFotoPerfil(input: UploadFotoPerfilInput): Promise<Result<FotoPerfilResponse, FacadeError>>;

  /**
   * Uploads a profile photo for any servidor (Admin only).
   * PATCH /servidores/:id/foto-perfil
   *
   * @param servidorId - Target servidor UUID.
   * @param input      - Local file URI, MIME type, and file name.
   * @returns Result wrapping the new CDN URL or a FacadeError.
   */
  uploadFotoPerfilAdmin(
    servidorId: string,
    input: UploadFotoPerfilInput,
  ): Promise<Result<FotoPerfilResponse, FacadeError>>;
}

/** Extended config with optional token getter for authenticated endpoints. */
export interface ServidoresFacadeConfig extends FacadeConfig {
  /** Returns the current JWT access token. Called at request time. */
  getToken?: () => string | null;
}

/**
 * API-backed implementation. Unwraps the { success, data, timestamp } envelope.
 * Sends Bearer auth on all requests — the backend requires authentication on
 * /servidores/:id.
 */
export class ServidoresFacadeImpl implements IServidoresFacade {
  private readonly mockMode: boolean;
  private readonly apiBaseUrl: string;
  private readonly getToken: () => string | null;

  constructor(config: ServidoresFacadeConfig = {}) {
    this.mockMode = config.mockMode ?? ENV.mockMode;
    this.apiBaseUrl = config.apiBaseUrl ?? ENV.apiUrl;
    this.getToken = config.getToken ?? (() => null);
  }

  private authHeaders(): Record<string, string> {
    const token = this.getToken();
    const headers: Record<string, string> = {'Content-Type': 'application/json'};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  private authHeadersMultipart(): Record<string, string> {
    const token = this.getToken();
    // Do NOT set Content-Type — fetch sets it automatically with the correct boundary
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  public async listServidores(): Promise<Result<Servidor[], FacadeError>> {
    if (this.mockMode) {
      await this.delay(250);
      return ok(MOCK_SERVIDORES);
    }
    try {
      const res = await fetch(`${this.apiBaseUrl}/servidores`, {
        headers: this.authHeaders(),
      });
      if (!res.ok) {
        console.warn('[ServidoresFacade] listServidores HTTP', res.status);
        return fail({code: 'NETWORK_ERROR', message: 'Failed to load servidores', statusCode: res.status});
      }
      const envelope = (await res.json()) as {success: boolean; data: Servidor[]};
      return ok(envelope.data);
    } catch {
      return fail({code: 'NETWORK_ERROR', message: 'Network error loading servidores', retryable: true});
    }
  }

  public async getServidorById(
    input: GetServidorByIdInput,
  ): Promise<Result<Servidor, FacadeError>> {
    if (this.mockMode) {
      await this.delay(150);
      const found = MOCK_SERVIDORES.find(s => s.id === input.id);
      if (!found) {
        return fail({code: 'NOT_FOUND', message: `Servidor ${input.id} not found`, statusCode: 404});
      }
      return ok(found);
    }
    try {
      console.log('[ServidoresFacade] GET /servidores/', input.id, '| auth:', !!this.getToken());
      const res = await fetch(`${this.apiBaseUrl}/servidores/${input.id}`, {
        headers: this.authHeaders(),
      });
      console.log('[ServidoresFacade] GET /servidores/', input.id, '← HTTP', res.status);
      if (res.status === 404) {
        return fail({code: 'NOT_FOUND', message: 'Servidor not found', statusCode: 404});
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.warn('[ServidoresFacade] getServidorById failed →', res.status, body);
        return fail({code: 'NETWORK_ERROR', message: 'Failed to load servidor', statusCode: res.status});
      }
      const raw = (await res.json()) as unknown;
      console.log('[ServidoresFacade] getServidorById raw response →', JSON.stringify(raw));
      // Handle both envelope { success, data } and direct object responses.
      const envelope = raw as {success?: boolean; data?: Servidor; nome?: string};
      const servidor = envelope.data ?? (envelope.nome ? (raw as Servidor) : null);
      if (!servidor) {
        console.warn('[ServidoresFacade] getServidorById — could not extract servidor from response');
        return fail({code: 'NETWORK_ERROR', message: 'Unexpected response shape', statusCode: 200});
      }
      return ok(servidor);
    } catch (err) {
      console.error('[ServidoresFacade] getServidorById EXCEPTION →', err);
      return fail({code: 'NETWORK_ERROR', message: 'Network error loading servidor', retryable: true});
    }
  }

  /**
   * Uploads a profile photo for the authenticated user.
   * PATCH /servidores/me/foto-perfil — multipart/form-data, field name "foto".
   */
  public async uploadFotoPerfil(
    input: UploadFotoPerfilInput,
  ): Promise<Result<FotoPerfilResponse, FacadeError>> {
    if (this.mockMode) {
      await this.delay(800);
      return ok({fotoPerfilUrl: 'https://cdn.example.com/avatars/mock/foto.webp'});
    }
    return this.patchFoto(`${this.apiBaseUrl}/servidores/me/foto-perfil`, input);
  }

  /**
   * Uploads a profile photo for any servidor (Admin only).
   * PATCH /servidores/:id/foto-perfil — multipart/form-data, field name "foto".
   */
  public async uploadFotoPerfilAdmin(
    servidorId: string,
    input: UploadFotoPerfilInput,
  ): Promise<Result<FotoPerfilResponse, FacadeError>> {
    if (this.mockMode) {
      await this.delay(800);
      return ok({fotoPerfilUrl: 'https://cdn.example.com/avatars/mock/foto-admin.webp'});
    }
    return this.patchFoto(`${this.apiBaseUrl}/servidores/${servidorId}/foto-perfil`, input);
  }

  /**
   * Shared multipart PATCH helper for both foto-perfil endpoints.
   * Builds a FormData with the "foto" field and sends it as multipart/form-data.
   */
  private async patchFoto(
    url: string,
    input: UploadFotoPerfilInput,
  ): Promise<Result<FotoPerfilResponse, FacadeError>> {
    try {
      const form = new FormData();
      // React Native's FormData accepts { uri, type, name } as a file entry.
      form.append('foto', {
        uri: input.uri,
        type: input.mimeType,
        name: input.fileName,
      } as unknown as Blob);

      const res = await fetch(url, {
        method: 'PATCH',
        headers: this.authHeadersMultipart(),
        body: form,
      });

      if (res.status === 400) {
        return fail({code: 'INVALID_FILE', message: 'Arquivo inválido — tipo não permitido ou imagem corrompida.', statusCode: 400});
      }
      if (res.status === 413) {
        return fail({code: 'FILE_TOO_LARGE', message: 'Arquivo muito grande (máx. 5MB).', statusCode: 413});
      }
      if (res.status === 404) {
        return fail({code: 'NOT_FOUND', message: 'Servidor não encontrado.', statusCode: 404});
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.warn('[ServidoresFacade] patchFoto failed →', res.status, body);
        return fail({code: 'NETWORK_ERROR', message: 'Falha ao enviar foto.', statusCode: res.status});
      }

      const data = (await res.json()) as FotoPerfilResponse;
      const fotoPerfilUrl =
        resolvePublicMediaUrl(data.fotoPerfilUrl, this.apiBaseUrl) ?? data.fotoPerfilUrl;
      return ok({fotoPerfilUrl});
    } catch (err) {
      console.error('[ServidoresFacade] patchFoto EXCEPTION →', err);
      return fail({code: 'NETWORK_ERROR', message: 'Erro de rede ao enviar foto.', retryable: true});
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
