import { Process, Processor } from '@nestjs/bull';
import { Logger, Inject } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import type { FilaDespachoPort } from '../../domain/ports/fila-despacho.port';
import type { CorridaRepositoryPort } from '../../domain/ports/corrida.repository.port';
import { ScoringService } from '../../domain/aggregates/fila-despacho/scoring.service';
import { CorridaStatus } from '../../domain/aggregates/corrida/corrida.state';
import { DespachoGateway } from '../../interface/ws/despacho.gateway';

export interface DespachoJobPayload {
  corridaId: string;
  raioAtualKm: number;
}

@Processor('despacho')
export class DespachoProcessor {
  private readonly logger = new Logger(DespachoProcessor.name);

  constructor(
    @InjectQueue('despacho')
    private readonly despachoQueue: Queue,
    @Inject('FilaDespachoPort')
    private readonly filaDespacho: FilaDespachoPort,
    @Inject('CorridaRepositoryPort')
    private readonly corridaRepo: CorridaRepositoryPort,
    private readonly scoringService: ScoringService,
    private readonly config: ConfigService,
    private readonly gateway: DespachoGateway,
  ) {}

  @Process('buscar-motoristas')
  async handleBuscarMotoristas(job: Job<DespachoJobPayload>) {
    const { corridaId, raioAtualKm } = job.data;
    this.logger.log(`Iniciando busca para corrida ${corridaId} com raio ${raioAtualKm}km`);

    const corrida = await this.corridaRepo.findById(corridaId);
    if (!corrida || corrida.status !== CorridaStatus.SOLICITADA) {
      this.logger.warn(`Corrida ${corridaId} não encontrada ou não está mais disponível para despacho.`);
      return;
    }

    const limitarPorMunicipio = this.config.get<boolean>('config.geo.limitarPorMunicipio');
    const municipioId = limitarPorMunicipio ? this.config.get<string>('config.geo.municipioId') : undefined;

    // 1. Buscar candidatos no raio atual
    const candidatosIds = await this.filaDespacho.buscarCandidatosNaRegiao(
      corrida.origem.lat,
      corrida.origem.lng,
      raioAtualKm,
      municipioId,
    );

    if (candidatosIds.length > 0) {
      this.logger.log(`Encontrados ${candidatosIds.length} candidatos para a corrida ${corridaId}`);
      
      // 2. Ordenar e preencher a fila
      // Nota: No mundo real, buscaríamos score de reputação e outros params. Aqui usamos valores mockados/padrão.
      const candidatosComDistancia = candidatosIds.map(id => ({
        motoristaId: id,
        distanciaMetros: 1000, // No real implementation, would calculate real driving distance
      }));

      const paramsMap = new Map();
      candidatosIds.forEach(id => {
        paramsMap.set(id, {
          nivelHierarquia: 1,
          tempoEsperaSeg: 0,
          isAutoridade: false,
          reputacao: 1.0,
        });
      });

      const candidatosOrdenados = this.scoringService.ordenarCandidatos(
        candidatosComDistancia,
        paramsMap,
      );

      await this.filaDespacho.criarFila(
        corridaId,
        candidatosOrdenados.map(c => ({ motoristaId: c.motoristaId, score: c.score })),
      );

      // Notificar motoristas via WebSocket
      this.gateway.notificarNovaCorrida({
        corridaId,
        mensagem: 'Nova corrida disponível perto de você!',
      });

      return;
    }

    // 3. Se não houver ninguém, tenta expandir
    const raioPasso = this.config.get<number>('config.geo.raioPassoExpansaoKm') || 5;
    const raioMaximo = this.config.get<number>('config.geo.raioMaximoDespachoKm') || 20;
    const proximoRaio = raioAtualKm + raioPasso;

    if (proximoRaio <= raioMaximo) {
      const delaySeg = this.config.get<number>('config.geo.intervaloExpansaoSegundos') || 30;
      this.logger.log(`Ninguém encontrado. Expandindo raio para ${proximoRaio}km em ${delaySeg}s`);

      await this.despachoQueue.add(
        'buscar-motoristas',
        { corridaId, raioAtualKm: proximoRaio },
        { delay: delaySeg * 1000 },
      );
    } else {
      // 4. Fallback final: Notificar todos os disponíveis no município
      this.logger.warn(`Raio máximo atingido para corrida ${corridaId}. Fallback: Notificar todos.`);
      this.gateway.notificarNovaCorrida({
        corridaId,
        mensagem: 'ATENÇÃO: Corrida aguardando atendimento na região!',
      });
    }
  }
}
