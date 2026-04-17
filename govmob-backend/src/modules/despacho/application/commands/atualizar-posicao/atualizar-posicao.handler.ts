import { Injectable, Inject, Logger } from '@nestjs/common';
import type { CorridaRepositoryPort } from '../../../domain/ports/corrida.repository.port';
import { PosicaoRedis } from '../../../infrastructure/redis/posicao.redis';

import { ValidadorTrajetoriaService } from '../../services/validador-trajetoria.service';

export class AtualizarPosicaoCommand {
  constructor(
    public readonly motoristaId: string,
    public readonly corridaId: string,
    public readonly lat: number,
    public readonly lng: number,
    public readonly velocidade: number,
    public readonly municipioId?: string,
    public readonly heading?: number,
  ) {}
}

@Injectable()
export class AtualizarPosicaoHandler {
  private readonly logger = new Logger(AtualizarPosicaoHandler.name);
  private readonly snapshotCounter = new Map<string, number>();

  constructor(
    @Inject('CorridaRepositoryPort')
    private readonly corridaRepo: CorridaRepositoryPort,
    private readonly posicaoRedis: PosicaoRedis,
    private readonly validador: ValidadorTrajetoriaService,
  ) {}

  async execute(command: AtualizarPosicaoCommand): Promise<void> {
    if (command.corridaId) {
      const corrida = await this.corridaRepo.findById(command.corridaId);
      if (corrida && corrida.rota.length > 0) {
        const ultimaPos = corrida.rota[corrida.rota.length - 1];
        const novaPos = {
          lat: command.lat,
          lng: command.lng,
          timestamp: new Date(),
        };

        if (!this.validador.validarSalto(ultimaPos, novaPos)) {
          this.logger.warn(
            `Descartando posição inválida (teleporte) para corrida ${command.corridaId}`,
          );
          return;
        }
      }
    }

    // Persistência em tempo real no Redis (Índice Espacial)
    await this.posicaoRedis.atualizar(
      command.motoristaId,
      command.corridaId || null,
      command.lat,
      command.lng,
      {
        velocidade: command.velocidade,
        heading: command.heading,
        municipioId: command.municipioId,
      },
    );

    // Se houver corrida, publicar para os interessados (Passageiro/Painel)
    if (command.corridaId) {
      const corrida = await this.corridaRepo.findById(command.corridaId);
      if (!corrida) return;

      // Lógica de "Motorista Chegando" (Automática)
      // Se estiver a menos de 200m da origem e ainda não notificou chegada
      const distanciaAteOrigem = this.calcularDistancia(
        command.lat,
        command.lng,
        corrida.origem.lat,
        corrida.origem.lng,
      );

      if (distanciaAteOrigem < 200) {
        corrida.registrarChegada();
        await this.corridaRepo.save(corrida);
      }

      await this.posicaoRedis.publicarParaPassageiro(command.corridaId, {
        lat: command.lat,
        lng: command.lng,
        velocidade: command.velocidade,
        heading: command.heading,
      });

      const count = (this.snapshotCounter.get(command.corridaId) ?? 0) + 1;
      this.snapshotCounter.set(command.corridaId, count);

      if (count % 10 === 0) {
        try {
          corrida.adicionarPosicao({
            lat: command.lat,
            lng: command.lng,
            timestamp: new Date(),
          });
          await this.corridaRepo.save(corrida);
        } catch (error) {
          this.logger.warn(`Failed to snapshot position: ${error}`);
        }
      }
    }
  }

  private calcularDistancia(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // metros
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dp / 2) * Math.sin(dp / 2) +
      Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
