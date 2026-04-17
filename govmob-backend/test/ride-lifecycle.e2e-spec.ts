import { TestEnvironment } from './helpers/test-environment';
import { SocketClient } from './helpers/socket-client';
import request from 'supertest';
import { HttpStatus } from '@nestjs/common';

describe('Ride Lifecycle (e2e)', () => {
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

    // 1. Obter Tokens
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

  it('deve realizar uma corrida completa: Solicitação -> Aceite -> Embarque -> Conclusão', async () => {
    await driverSocket.emit('ficar-disponivel');

    const solicitacaoRes = await request(app.getHttpServer())
      .post('/corridas')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        origemLat: -23.5505,
        origemLng: -46.6333,
        destinoLat: -23.553,
        destinoLng: -46.636,
        motivoServico: 'Teste e2e',
      })
      .expect(HttpStatus.ACCEPTED);

    const corridaId = solicitacaoRes.body.corridaId;
    expect(corridaId).toBeDefined();

    await passengerSocket.emit('assinar-corrida', { corridaId });

    await request(app.getHttpServer())
      .post(`/corridas/${corridaId}/aceitar`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ veiculoId: '00000000-0000-6000-b000-000000000001' })
      .expect(HttpStatus.CREATED);

    let statusRecebido = '';
    passengerSocket.on('status-corrida-alterado', (data) => {
      statusRecebido = data.status;
    });

    // Aguarda processamento
    await new Promise((resolve) => setTimeout(resolve, 2000));
    expect(statusRecebido).toBe('CorridaAceita');

    await request(app.getHttpServer())
      .post(`/corridas/${corridaId}/iniciar-deslocamento`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .post(`/corridas/${corridaId}/confirmar-embarque`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .post(`/corridas/${corridaId}/finalizar`)
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(HttpStatus.OK);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(statusRecebido).toBe('CorridaConcluida');
  }, 30000);
});
