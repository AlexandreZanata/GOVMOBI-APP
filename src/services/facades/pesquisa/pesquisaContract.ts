/**
 * @fileoverview Pesquisa facade contract and config.
 */
import type {
  GetRouteInput,
  GeocodingResult,
  GeocodeAddressInput,
  PesquisaRouteResult,
  PesquisaConfig,
  ReverseGeocodingResult,
  ReverseGeocodeInput,
} from '../../../types/pesquisa';
import type {FacadeConfig, FacadeError, Result} from '../types';

/**
 * Facade contract for the /pesquisa/* endpoints.
 */
export interface IPesquisaFacade {
  getPesquisaConfig(): Promise<Result<PesquisaConfig, FacadeError>>;
  geocodeAddress(
    input: GeocodeAddressInput,
  ): Promise<Result<GeocodingResult[], FacadeError>>;
  reverseGeocode(
    input: ReverseGeocodeInput,
  ): Promise<Result<ReverseGeocodingResult, FacadeError>>;
  getRouteBetweenPoints(
    input: GetRouteInput,
  ): Promise<Result<PesquisaRouteResult, FacadeError>>;
}

/**
 * Extended facade config that accepts a token getter for authenticated requests.
 */
export interface PesquisaFacadeConfig extends FacadeConfig {
  getToken?: () => string | null;
}
