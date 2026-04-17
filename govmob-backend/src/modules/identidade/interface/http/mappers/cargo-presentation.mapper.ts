import { Cargo } from '../../../domain/aggregates/cargo.aggregate';

export class CargoPresentationMapper {
  static toResponse(cargo: Cargo) {
    return {
      id: cargo.id,
      nome: cargo.nome,
      pesoPrioridade: cargo.pesoPrioridade,
      ativo: cargo.ativo,
      createdAt: cargo.createdAt,
      updatedAt: cargo.updatedAt,
      deletedAt: cargo.deletedAt,
    };
  }
}
