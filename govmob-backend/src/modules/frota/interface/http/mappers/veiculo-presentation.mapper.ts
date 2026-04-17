import { Veiculo } from '../../../domain/aggregates/veiculo.aggregate';

export class VeiculoPresentationMapper {
  static toResponse(veiculo: Veiculo) {
    return {
      id: veiculo.id,
      placa: veiculo.placa,
      modelo: veiculo.modelo,
      ano: veiculo.ano,
      ativo: veiculo.ativo,
      createdAt: veiculo.createdAt,
      updatedAt: veiculo.updatedAt,
      deletedAt: veiculo.deletedAt,
    };
  }
}
