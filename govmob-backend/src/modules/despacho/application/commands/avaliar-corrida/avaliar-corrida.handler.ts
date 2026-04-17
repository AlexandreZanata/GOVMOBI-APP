import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import { ForbiddenError } from '../../../../../shared-kernel/errors';
import type { CorridaRepositoryPort } from '../../../domain/ports/corrida.repository.port';
import type { AvaliacaoRepositoryPort } from '../../../domain/ports/avaliacao.repository.port';
import { Avaliacao } from '../../../domain/aggregates/avaliacao/avaliacao.aggregate';
import { CorridaStatus } from '../../../domain/aggregates/corrida/corrida.state';
import { TransactionManager } from '../../../../../shared-kernel/infrastructure/persistence/transaction.manager';

export class AvaliarCorridaCommand {
  constructor(
    public readonly corridaId: string,
    public readonly passageiroId: string,
    public readonly nota: number,
    public readonly comentario?: string,
  ) {}
}

@Injectable()
export class AvaliarCorridaHandler {
  constructor(
    @Inject('CorridaRepositoryPort')
    private readonly corridaRepo: CorridaRepositoryPort,
    @Inject('AvaliacaoRepositoryPort')
    private readonly avaliacaoRepo: AvaliacaoRepositoryPort,
    @Inject('MotoristaRepositoryPort')
    private readonly motoristaRepo: any, // Port from FrotaModule
    private readonly configService: ConfigService,
    private readonly transactionManager: TransactionManager,
  ) {}

  async execute(command: AvaliarCorridaCommand): Promise<void> {
    const { corridaId, passageiroId, nota, comentario } = command;

    const corrida = await this.corridaRepo.findById(corridaId);
    if (!corrida) {
      throw new BadRequestException('Corrida não encontrada');
    }

    if (corrida.passageiroId !== passageiroId) {
      throw new ForbiddenError('Apenas o passageiro da corrida pode avaliá-la');
    }

    if (corrida.status !== CorridaStatus.CONCLUIDA) {
      throw new BadRequestException('Apenas corridas concluídas podem ser avaliadas');
    }

    // Verificar prazo (Business Rule: 3 dias)
    const maxDias = this.configService.get<number>('config.geo.maxDiasAvaliacao', 3);
    const dataLimite = new Date(corrida.timestamps.concluidaEm!.getTime() + maxDias * 24 * 60 * 60 * 1000);
    if (new Date() > dataLimite) {
      throw new BadRequestException(`O prazo para avaliação desta corrida expirou (${maxDias} dias)`);
    }

    if (!corrida.motoristaId) {
      throw new BadRequestException('Corrida não possui motorista associado');
    }

    const avaliacao = Avaliacao.criar(uuid(), {
      corridaId,
      passageiroId,
      motoristaId: corrida.motoristaId,
      nota,
      comentario,
    });

    const motorista = await this.motoristaRepo.findById(corrida.motoristaId);
    if (!motorista) {
      throw new BadRequestException('Motorista not found');
    }

    // Transação: Salvar avaliação, Mudar estado da corrida, Atualizar média do motorista
    await this.transactionManager.run(async (em) => {
      await this.avaliacaoRepo.save(avaliacao);
      
      corrida.transitarPara(CorridaStatus.AVALIADA);
      await this.corridaRepo.save(corrida, em);

      motorista.registrarNovaAvaliacao(nota);
      await this.motoristaRepo.save(motorista, em);
    });
  }
}
