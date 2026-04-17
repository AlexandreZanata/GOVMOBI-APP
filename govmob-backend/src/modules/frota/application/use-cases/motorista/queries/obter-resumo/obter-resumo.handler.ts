import { Injectable, Inject, NotFoundException } from '@nestjs/common';

export class ObterResumoMotoristaQuery {
  constructor(public readonly motoristaId: string) {}
}

export interface MotoristaResumoDto {
  notaMedia: number;
  totalAvaliacoes: number;
}

@Injectable()
export class ObterResumoMotoristaHandler {
  constructor(
    @Inject('MotoristaRepositoryPort')
    private readonly motoristaRepo: any,
  ) {}

  async execute(query: ObterResumoMotoristaQuery): Promise<MotoristaResumoDto> {
    const motorista = await this.motoristaRepo.findById(query.motoristaId);
    if (!motorista) {
      throw new NotFoundException('Motorista não encontrado');
    }

    return {
      notaMedia: motorista.notaMedia,
      totalAvaliacoes: motorista.totalAvaliacoes,
    };
  }
}
