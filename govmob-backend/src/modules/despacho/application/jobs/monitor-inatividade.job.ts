import { Injectable, Inject, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import type { CorridaRepositoryPort } from '../../domain/ports/corrida.repository.port';
import { CorridaStatus } from '../../domain/aggregates/corrida/corrida.state';
import { RedisService } from '../../../../shared-kernel/infrastructure/redis/redis.service';

@Injectable()
export class MonitorInatividadeJob {
  private readonly logger = new Logger(MonitorInatividadeJob.name);

  // Timeout padrão de 10 minutos (em milissegundos)
  private readonly DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

  constructor(
    @Inject('CorridaRepositoryPort')
    private readonly corridaRepo: CorridaRepositoryPort,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  @Interval(2 * 60 * 1000) // Executa a cada 2 minutos
  async verificarInatividades(): Promise<void> {
    const timeoutThreshold =
      (this.config.get<number>('GHOST_RIDE_TIMEOUT_MIN') || 10) * 60 * 1000;
    const agora = Date.now();

    this.logger.debug(
      `Iniciando verificação de inatividade (Threshold: ${timeoutThreshold / 60000} min)`,
    );

    try {
      const corridasAceitas = await this.corridaRepo.findByStatus(
        CorridaStatus.ACEITA,
      );

      for (const corrida of corridasAceitas) {
        const aceitaEm = corrida.timestamps.aceitaEm?.getTime() || 0;
        const tempoDesdeAceite = agora - aceitaEm;

        if (tempoDesdeAceite > timeoutThreshold) {
          // Se não há rota gravada ou se o motorista está no mesmo ponto há muito tempo
          const motoristaPos = await this.redis
            .getClient()
            .geopos('motoristas:posicoes', corrida.motoristaId!);

          if (!motoristaPos || motoristaPos.length === 0) {
            this.logger.warn(
              `Corrida ${corrida.id} expirada por inatividade (Motorista sem GPS)`,
            );
            corrida.expirar();
            await this.corridaRepo.save(corrida);
            continue;
          }

          // Nota: Lógica de comparação de distância pode ser adicionada aqui
          // Simplificado conforme plano: Se passou do tempo e ainda está em ACEITA (não iniciou deslocamento)
          this.logger.warn(
            `Corrida ${corrida.id} expirada por inatividade (Timeout de 10min excedido)`,
          );
          corrida.expirar();
          await this.corridaRepo.save(corrida);
        }
      }
    } catch (error) {
      this.logger.error('Erro ao monitorar inatividades:', error);
    }
  }
}
