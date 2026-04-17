import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { RedisPubSubService } from '../../../../shared-kernel/infrastructure/redis/redis-pubsub.service';
import { DespachoGateway } from '../../interface/ws/despacho.gateway';
import type { PushNotificationPort } from '../../../../shared-kernel/infrastructure/notificacao/push-notification.port';
import type { CorridaRepositoryPort } from '../../domain/ports/corrida.repository.port';
import { Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DespachoEventSubscriber implements OnModuleInit {
  private readonly logger = new Logger(DespachoEventSubscriber.name);

  constructor(
    private readonly redisPubSub: RedisPubSubService,
    private readonly gateway: DespachoGateway,
    @Inject('PushNotificationPort')
    private readonly pushService: PushNotificationPort,
    @Inject('CorridaRepositoryPort')
    private readonly corridaRepo: CorridaRepositoryPort,
    @InjectQueue('despacho')
    private readonly despachoQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    // 1. Ouvir eventos do domínio Despacho (Lifecycle da Corrida)
    await this.redisPubSub.subscribe('despacho-events', (payload) => {
      this.handleDespachoEvent(payload);
    });

    // 2. Ouvir eventos de Notificação (Notificações ao motorista/usuário)
    await this.redisPubSub.subscribe('notification-events', (payload) => {
      this.handleNotificationEvent(payload);
    });

    this.logger.log(
      'DespachoEventSubscriber initialized and listening to Redis',
    );
  }

  private handleDespachoEvent(payload: any) {
    const { aggregateId, eventName, data } = payload;
    this.logger.debug(
      `Processing Despacho Event: ${eventName} for ${aggregateId}`,
    );

    // Mapeia eventos de domínio para emissões via WebSocket
    switch (eventName) {
      case 'CorridaAceita':
      case 'DeslocamentoIniciado':
      case 'MotoristaChegando':
      case 'EmbarqueConfirmado':
      case 'CorridaConcluida':
      case 'CorridaCancelada':
        this.gateway.emitirStatusCorrida(aggregateId, eventName, data);
        this.enviarPushParaInteressados(aggregateId, eventName, data);
        break;
    }
  }

  private async enviarPushParaInteressados(
    corridaId: string,
    eventName: string,
    data: any,
  ) {
    try {
      const corrida = await this.corridaRepo.findById(corridaId);
      if (!corrida) return;

      const passageiroId = corrida.passageiroId;
      const motoristaId = corrida.motoristaId;

      switch (eventName) {
        case 'CorridaAceita':
          await this.pushService.enviar(passageiroId, {
            title: 'Corrida Aceita',
            message: 'Um motorista aceitou sua corrida e está a caminho!',
            data: { corridaId, status: 'ACEITA' },
          });
          break;
        case 'MotoristaChegando':
          await this.pushService.enviar(passageiroId, {
            title: 'Motorista Chegando',
            message: 'Seu motorista está chegando ao local de embarque!',
            data: { corridaId, status: 'CHEGANDO' },
          });
          break;
        case 'CorridaCancelada':
          // Notifica o "outro" lado
          const destinatarioId =
            data.canceladoPor === passageiroId ? motoristaId : passageiroId;
          if (destinatarioId) {
            await this.pushService.enviar(destinatarioId, {
              title: 'Corrida Cancelada',
              message: 'A corrida foi cancelada.',
              data: { corridaId, status: 'CANCELADA' },
            });
          }
          break;
      }
    } catch (error) {
      this.logger.error(`Erro ao enviar push: ${error.message}`);
    }
  }

  private handleNotificationEvent(payload: any) {
    const { eventName, data } = payload;

    // Especial: Nova corrida disponível para motoristas
    if (eventName === 'NovaCorridaSolicitada') {
      const corridaId = data.corridaId;
      const raioInicial =
        this.config.get<number>('config.geo.raioInicialDespachoKm') || 5;

      this.logger.log(
        `Iniciando busca automática para corrida ${corridaId} (Raio Inicial: ${raioInicial}km)`,
      );

      this.despachoQueue.add('buscar-motoristas', {
        corridaId,
        raioAtualKm: raioInicial,
      });

      this.gateway.notificarNovaCorrida(data);
    }
  }
}
