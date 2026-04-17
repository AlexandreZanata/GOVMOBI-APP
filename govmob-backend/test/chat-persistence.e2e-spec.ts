import { TestEnvironment } from './helpers/test-environment';
import { SocketClient } from './helpers/socket-client';
import request from 'supertest';
import { HttpStatus } from '@nestjs/common';

describe('Chat Persistence (e2e)', () => {
  let testEnv: TestEnvironment;
  let app: any;
  let passengerToken: string;
  let driverToken: string;
  let passengerSocket: SocketClient;
  let driverSocket: SocketClient;

  beforeAll(async () => {
    testEnv = new TestEnvironment();
    const { app: nestApp } = await testEnv.start();
    app = nestApp;
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ cpf: '00301748136', senha: 'GovMob@2026' });

    passengerToken = loginRes.body.accessToken;
    driverToken = loginRes.body.accessToken;

    const baseUrl = `http://localhost:${app.getHttpServer().address()?.port}/despacho`;
    passengerSocket = new SocketClient(baseUrl, passengerToken);
    driverSocket = new SocketClient(baseUrl, driverToken);

    await Promise.all([passengerSocket.connect(), driverSocket.connect()]);
  }, 60000);

  afterAll(async () => {
    passengerSocket?.disconnect();
    driverSocket?.disconnect();
    await testEnv.stop();
  });

  it('deve persistir mensagens e permitir recuperação de histórico por ambos participantes', async () => {
    const solicitacaoRes = await request(app.getHttpServer())
      .post('/corridas')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        origemLat: -23.5505,
        origemLng: -46.6333,
        destinoLat: -23.553,
        destinoLng: -46.636,
        motivoServico: 'Teste Chat',
      })
      .expect(HttpStatus.ACCEPTED);

    const corridaId = solicitacaoRes.body.corridaId;
    await request(app.getHttpServer())
      .post(`/corridas/${corridaId}/aceitar`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ veiculoId: '00000000-0000-6000-b000-000000000001' })
      .expect(HttpStatus.CREATED);

    await passengerSocket.emit('assinar-corrida', { corridaId });
    await driverSocket.emit('assinar-corrida', { corridaId });

    let recebidaPorDriver = null;
    driverSocket.on('nova-mensagem', (msg) => {
      recebidaPorDriver = msg;
    });

    passengerSocket.emit('enviar-mensagem', {
      corridaId,
      conteudo: 'Olá, estou com uma camisa azul.',
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));
    expect(recebidaPorDriver).toBeDefined();
    expect((recebidaPorDriver as any).conteudo).toBe(
      'Olá, estou com uma camisa azul.',
    );

    const historicoRes = await request(app.getHttpServer())
      .get(`/corridas/${corridaId}/mensagens`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(HttpStatus.OK);

    expect(historicoRes.body).toHaveLength(1);
    expect(historicoRes.body[0].conteudo).toBe(
      'Olá, estou com uma camisa azul.',
    );
  }, 20000);
});
