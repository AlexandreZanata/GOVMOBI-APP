import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { OneSignalPushService } from './onesignal-push.service';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('OneSignalPushService', () => {
  let service: OneSignalPushService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockAppId = 'test-app-id';
  const mockApiKey = 'test-api-key';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OneSignalPushService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'config.onesignal.appId') return mockAppId;
              if (key === 'config.onesignal.restApiKey') return mockApiKey;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OneSignalPushService>(OneSignalPushService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('enviar', () => {
    it('deve enviar um push com sucesso para um usuário específico', async () => {
      const mockResponse: AxiosResponse = {
        data: { id: 'msg-id' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as any },
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      const payload = {
        title: 'Teste',
        message: 'Olá mundo',
        data: { foo: 'bar' },
      };
      await service.enviar('user-123', payload);

      expect(httpService.post).toHaveBeenCalledWith(
        'https://onesignal.com/api/v1/notifications',
        expect.objectContaining({
          app_id: mockAppId,
          include_external_user_ids: ['user-123'],
          headings: { pt: 'Teste', en: 'Teste' },
          contents: { pt: 'Olá mundo', en: 'Olá mundo' },
          data: { foo: 'bar' },
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Basic ${mockApiKey}`,
          }),
        }),
      );
    });

    it('não deve enviar se as credenciais estiverem faltando', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(null);
      // Recria o serviço para pegar os valores nulos no construtor
      service = new OneSignalPushService(httpService, configService);

      const spyPost = jest.spyOn(httpService, 'post');
      await service.enviar('user-123', { title: 'T', message: 'M' });

      expect(spyPost).not.toHaveBeenCalled();
    });

    it('deve logar erro se a API do OneSignal falhar', async () => {
      const errorResponse = {
        response: {
          data: { errors: ['Invalid External ID'] },
        },
      };

      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => errorResponse));
      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await service.enviar('user-123', { title: 'T', message: 'M' });

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[OneSignal] Erro ao enviar push para user-123: Invalid External ID',
        ),
      );
    });
  });

  describe('enviarParaGestor', () => {
    it('deve enviar push para o segmento de Gestores', async () => {
      const mockResponse: AxiosResponse = {
        data: { id: 'msg-id' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as any },
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      await service.enviarParaGestor({ title: 'Gestor', message: 'Aviso' });

      expect(httpService.post).toHaveBeenCalledWith(
        'https://onesignal.com/api/v1/notifications',
        expect.objectContaining({
          included_segments: ['Gestores'],
        }),
        expect.any(Object),
      );
    });
  });
});

