import { INestApplication, HttpStatus } from '@nestjs/common';
import request, { Response } from 'supertest';
import { Server } from 'http';
import { TestEnvironment } from './helpers/test-environment';

type TokenBody = {
  accessToken?: string;
  refreshToken?: string;
};

type AccessTokenBody = {
  accessToken: string;
};

describe('Auth Security (e2e)', () => {
  let testEnv: TestEnvironment;
  let app: INestApplication;

  beforeAll(async () => {
    testEnv = new TestEnvironment();
    const { app: nestApp } = await testEnv.start();
    app = nestApp;
  }, 60000);

  afterAll(async () => {
    await testEnv.stop();
  });

  describe('Global Authentication', () => {
    it('should deny access to /servidores without token', async () => {
      await request(app.getHttpServer() as unknown as Server)
        .get('/servidores')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should deny access to /frota/veiculos without token', async () => {
      await request(app.getHttpServer() as unknown as Server)
        .get('/frota/veiculos')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Authentication Flow', () => {
    const testCpf = '00301748136';
    const testPass = 'GovMob@2026';

    it('should allow login with correct credentials', async () => {
      const response: Response = await request(
        app.getHttpServer() as unknown as Server,
      )
        .post('/auth/login')
        .send({
          cpf: testCpf,
          senha: testPass,
        })
        .expect(HttpStatus.OK);

      const body = response.body as TokenBody;
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
    });

    it('should deny login with wrong password', async () => {
      await request(app.getHttpServer() as unknown as Server)
        .post('/auth/login')
        .send({
          cpf: testCpf,
          senha: 'wrong_password',
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    let adminToken: string;

    beforeAll(async () => {
      const response: Response = await request(
        app.getHttpServer() as unknown as Server,
      )
        .post('/auth/login')
        .send({
          cpf: '00301748136',
          senha: 'GovMob@2026',
        })
        .expect(HttpStatus.OK);

      const body = response.body as AccessTokenBody;
      adminToken = body.accessToken;
    });

    it('should allow ADMIN to list vehicles', async () => {
      await request(app.getHttpServer() as unknown as Server)
        .get('/frota/veiculos')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });
});
