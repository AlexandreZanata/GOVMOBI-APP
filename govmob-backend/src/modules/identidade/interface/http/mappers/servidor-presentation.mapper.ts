import { Servidor } from '../../../domain/aggregates/servidor.aggregate';

export class ServidorPresentationMapper {
  static toResponse(servidor: Servidor) {
    return {
      id: servidor.id,
      nome: servidor.nome,
      cpf: servidor.cpf?.getValue,
      email: servidor.email?.getValue,
      telefone: servidor.telefone,
      cargoId: servidor.cargoId,
      lotacaoId: servidor.lotacaoId,
      papeis: servidor.papeis,
      statusConta: servidor.statusConta,
      ativo: servidor.ativo,
      createdAt: servidor.createdAt,
      updatedAt: servidor.updatedAt,
      deletedAt: servidor.deletedAt,
    };
  }
}
