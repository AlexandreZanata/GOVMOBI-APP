import { Lotacao } from '../../../domain/aggregates/lotacao.aggregate';

export class LotacaoPresentationMapper {
  static toResponse(lotacao: Lotacao) {
    return {
      id: lotacao.id,
      nome: lotacao.nome,
      ativo: lotacao.ativo,
      createdAt: lotacao.createdAt,
      updatedAt: lotacao.updatedAt,
      deletedAt: lotacao.deletedAt,
    };
  }
}
