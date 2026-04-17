import { Injectable, Inject } from '@nestjs/common';
import type { AvaliacaoRepositoryPort } from '../../../domain/ports/avaliacao.repository.port';

export class ListarAvaliacoesAdminQuery {}

export interface AvaliacaoAdminDto {
  id: string;
  corridaId: string;
  passageiroId: string;
  motoristaId: string;
  nota: number;
  comentario?: string;
  createdAt: Date;
}

@Injectable()
export class ListarAvaliacoesAdminHandler {
  constructor(
    @Inject('AvaliacaoRepositoryPort')
    private readonly avaliacaoRepo: AvaliacaoRepositoryPort,
  ) {}

  async execute(_query: ListarAvaliacoesAdminQuery): Promise<AvaliacaoAdminDto[]> {
    const avaliacoes = await this.avaliacaoRepo.findAll();
    
    return avaliacoes.map((a) => ({
      id: a.id,
      corridaId: a.corridaId,
      passageiroId: a.passageiroId,
      motoristaId: a.motoristaId,
      nota: a.nota,
      comentario: a.comentario,
      createdAt: a.createdAt,
    }));
  }
}
