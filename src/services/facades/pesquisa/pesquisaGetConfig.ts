/**
 * @fileoverview GET /pesquisa/config
 */
import type {PesquisaConfig} from '../../../types/pesquisa';
import type {FacadeError, Result} from '../types';
import {
  AUTH_HTTP_TIMEOUT_MS,
  fetchWithAbortTimeout,
} from '@services/http/fetchWithAbortTimeout';
import {fail, ok} from './pesquisaResult';
import {toPesquisaConfig} from './pesquisaParse';
import {pesquisaDelay} from './pesquisaMock';

export async function pesquisaGetPesquisaConfig(
  apiBaseUrl: string,
  mockMode: boolean,
  authHeaders: () => Record<string, string>,
): Promise<Result<PesquisaConfig, FacadeError>> {
  if (mockMode) {
    await pesquisaDelay(120);
    return ok({mapboxPublicToken: 'pk.mock_token_for_testing'});
  }

  try {
    const headers = authHeaders();
    console.info('[PesquisaFacade] GET /pesquisa/config', {
      url: `${apiBaseUrl}/pesquisa/config`,
      hasAuth: 'Authorization' in headers,
    });
    const res = await fetchWithAbortTimeout(
      `${apiBaseUrl}/pesquisa/config`,
      {headers},
      AUTH_HTTP_TIMEOUT_MS,
    );

    console.info('[PesquisaFacade] /pesquisa/config status:', res.status);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[PesquisaFacade] /pesquisa/config error body:', body);
      return fail({
        code: 'NETWORK_ERROR',
        message: 'Failed to load pesquisa config',
        statusCode: res.status,
      });
    }

    const payload = (await res.json()) as unknown;
    console.info(
      '[PesquisaFacade] /pesquisa/config raw payload:',
      JSON.stringify(payload),
    );
    const data = toPesquisaConfig(payload);

    if (!data) {
      console.error(
        '[PesquisaFacade] toPesquisaConfig returned null for payload:',
        JSON.stringify(payload),
      );
      return fail({
        code: 'PARSE_ERROR',
        message: 'Invalid pesquisa config payload',
      });
    }

    return ok(data);
  } catch (err) {
    console.error(
      '[PesquisaFacade] /pesquisa/config network exception:',
      err,
    );
    return fail({
      code: 'NETWORK_ERROR',
      message: 'Network error loading pesquisa config',
      retryable: true,
    });
  }
}
