import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { PushNotificationPort } from '../../../../shared-kernel/infrastructure/notificacao/push-notification.port';

@Injectable()
export class OneSignalPushService implements PushNotificationPort {
  private readonly logger = new Logger(OneSignalPushService.name);
  private readonly oneSignalUrl = 'https://onesignal.com/api/v1/notifications';
  private readonly appId: string;
  private readonly restApiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.appId = this.configService.get<string>('config.onesignal.appId')!;
    this.restApiKey = this.configService.get<string>(
      'config.onesignal.restApiKey',
    )!;
  }

  async enviar(
    servidorId: string,
    payload: { title: string; message: string; data?: any },
  ): Promise<void> {
    if (!this.appId || !this.restApiKey) {
      this.logger.warn(
        '[OneSignal] Credenciais não configuradas. Pulando envio.',
      );
      return;
    }

    const body = {
      app_id: this.appId,
      include_external_user_ids: [servidorId],
      headings: { pt: payload.title, en: payload.title },
      contents: { pt: payload.message, en: payload.message },
      data: payload.data || {},
    };

    try {
      await lastValueFrom(
        this.httpService.post(this.oneSignalUrl, body, {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Authorization: `Basic ${this.restApiKey}`,
          },
        }),
      );
      this.logger.log(`[OneSignal] Push enviado para ${servidorId}`);
    } catch (error) {
      this.logger.error(
        `[OneSignal] Erro ao enviar push para ${servidorId}: ${error.response?.data?.errors?.[0] || error.message}`,
      );
    }
  }

  async enviarParaGestor(payload: {
    title: string;
    message: string;
    data?: any;
  }): Promise<void> {
    if (!this.appId || !this.restApiKey) return;

    const body = {
      app_id: this.appId,
      included_segments: ['Gestores'],
      headings: { pt: payload.title },
      contents: { pt: payload.message },
      data: payload.data || {},
    };

    try {
      await lastValueFrom(
        this.httpService.post(this.oneSignalUrl, body, {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Authorization: `Basic ${this.restApiKey}`,
          },
        }),
      );
    } catch (error) {
      this.logger.error(
        `[OneSignal] Erro ao enviar push para gestores: ${error.message}`,
      );
    }
  }

  async broadcast(
    corridaId: string,
    _payload: { title: string; message: string; data?: any },
  ): Promise<void> {
    void _payload;
    // Broadcast para usuários associados à corrida (via tags ou external ids)
    this.logger.log(
      `[OneSignal] Broadcast para corrida ${corridaId} solicitado. Implementação customizada necessária se usar tags.`,
    );
  }
}
