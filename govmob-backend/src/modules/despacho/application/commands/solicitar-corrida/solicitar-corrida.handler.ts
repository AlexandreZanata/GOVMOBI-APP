import { Injectable, Inject, Logger } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { Corrida } from '../../../domain/aggregates/corrida/corrida.aggregate';
import type { CorridaRepositoryPort } from '../../../domain/ports/corrida.repository.port';
import type { IdentidadePort } from '../../../domain/ports/identidade.port';
import { PostGISService } from '../../../../cartografia/infrastructure/postgis/postgis.service';
import { MunicipioBoundaryRepository } from '../../../../cartografia/infrastructure/postgis/municipio-boundary.repository';
import { Coordenada } from '../../../../cartografia/domain/value-objects/coordenada.vo';
import {
  ConflictError,
  GeoBoundaryError,
} from '../../../../../shared-kernel/errors';
import { OutboxMapper } from '../../../../../shared-kernel/infrastructure/outbox/outbox.mapper';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export class SolicitarCorridaCommand {
  constructor(
    public readonly passageiroId: string,
    public readonly origemLat: number,
    public readonly origemLng: number,
    public readonly destinoLat: number,
    public readonly destinoLng: number,
    public readonly motivoServico: string,
    public readonly observacoes?: string,
  ) {}
}

@Injectable()
export class SolicitarCorridaHandler {
  private readonly logger = new Logger(SolicitarCorridaHandler.name);

  constructor(
    @Inject('CorridaRepositoryPort')
    private readonly corridaRepo: CorridaRepositoryPort,
    @Inject('IdentidadePort')
    private readonly identidadePort: IdentidadePort,
    private readonly postgis: PostGISService,
    private readonly municipioRepo: MunicipioBoundaryRepository,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    command: SolicitarCorridaCommand,
  ): Promise<{ corridaId: string }> {
    const servidor = await this.identidadePort.buscarServidor(
      command.passageiroId,
    );
    if (!servidor) throw new ConflictError('Servidor não encontrado');

    // Validação de Cooldown (Rate Limiting)
    const cooldown = await this.identidadePort.verificarCooldownCancelamento(
      command.passageiroId,
    );
    if (cooldown.bloqueado) {
      throw new ConflictError(
        `Limite de cancelamentos excedido. Tente novamente em ${cooldown.restanteMin} minutos.`,
      );
    }

    const corridaAtiva = await this.corridaRepo.findAtivaByPassageiroId(
      command.passageiroId,
    );
    if (corridaAtiva)
      throw new ConflictError(
        'Já existe uma corrida em andamento para este passageiro',
      );

    // Validação de Distância Mínima (200 metros)
    const distanciaPrevista = Coordenada.calcularDistancia(
      { lat: command.origemLat, lng: command.origemLng },
      { lat: command.destinoLat, lng: command.destinoLng },
    );
    if (distanciaPrevista < 0.2) {
      throw new ConflictError(
        'A distância mínima permitida para uma corrida é de 200 metros.',
      );
    }

    const destino = Coordenada.criar(command.destinoLat, command.destinoLng);
    const limitarPorMunicipio = this.configService.get<boolean>(
      'config.geo.limitarPorMunicipio',
    );

    if (limitarPorMunicipio) {
      const municipioWkt = await this.municipioRepo.loadBoundary(
        this.configService.get<string>('config.geo.municipioId')!,
      );
      if (municipioWkt) {
        const dentroMunicipio = await this.postgis.stWithin(
          destino.toWKT(),
          municipioWkt,
        );
        if (!dentroMunicipio) {
          throw new GeoBoundaryError('fora_municipio', {
            destino: { lat: command.destinoLat, lng: command.destinoLng },
          });
        }
      }
    }

    const origem = Coordenada.criar(command.origemLat, command.origemLng);
    const corridaId = uuidv7();
    const corrida = Corrida.criar(corridaId, {
      passageiroId: command.passageiroId,
      origem,
      destino,
      motivoServico: command.motivoServico,
      prioridadeNivel: servidor.nivelHierarquia,
    });

    await this.dataSource.transaction(async (manager) => {
      // 1. Salvar a corrida
      await this.corridaRepo.save(corrida, manager);

      // 2. Especial: Gerar evento de Notificação para o Outbox
      const notificacao = OutboxMapper.toEntity(
        { eventType: 'NovaCorridaSolicitada', aggregateId: corridaId },
        'Notification',
        {
          title: 'Nova Solicitação',
          message: `Passageiro solicitou corrida para: ${command.motivoServico}`,
          corridaId,
        },
      );

      // 3. Salvar eventos de domínio originais da corrida no outbox
      const domainEvents = corrida.domainEvents.map((e) =>
        OutboxMapper.toEntity(e, 'Despacho', e),
      );

      await manager.save([notificacao, ...domainEvents]);
    });

    this.logger.log(
      `Corrida ${corridaId} solicitada pelo passageiro ${command.passageiroId} (Notificação enfileirada no Outbox)`,
    );
    return { corridaId };
  }
}
