import { Motorista } from '../../../domain/aggregates/motorista.aggregate';

export class MotoristaPresentationMapper {
  static toResponse(motorista: Motorista) {
    return {
      id: motorista.id,
      servidorId: motorista.servidorId,
      cnhNumero: motorista.cnhNumero,
      cnhCategoria: motorista.cnhCategoria,
      statusOperacional: motorista.statusOperacional,
      ativo: motorista.ativo,
      createdAt: motorista.createdAt,
      updatedAt: motorista.updatedAt,
      deletedAt: motorista.deletedAt,
    };
  }
}
