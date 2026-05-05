/**
 * @fileoverview Input/filter types for the Frota domain (veículos + motoristas).
 */
import {type MotoristaStatusOperacional} from '@models/Motorista';

/** Filter params for the veículos list. */
export interface VeiculosFilter {
  search?: string;
  ativo?: boolean;
}

/** Filter params for the motoristas list. */
export interface MotoristasFilter {
  statusOperacional?: MotoristaStatusOperacional;
  ativo?: boolean;
}

/** POST /frota/motoristas/me/veiculo body. */
export interface VeiculoAssociationInput {
  veiculoId: string;
}
