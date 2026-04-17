import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { PushNotificationPort } from '../../src/shared-kernel/infrastructure/notificacao/push-notification.port';

class MockPushNotificationService implements PushNotificationPort {
  async enviar(): Promise<void> {}
  async enviarParaGestor(): Promise<void> {}
  async broadcast(): Promise<void> {}
}

export class TestEnvironment {
  private pgContainer: StartedPostgreSqlContainer;
  private redisContainer: StartedRedisContainer;
  private app: INestApplication;

  async start() {
    this.pgContainer = await new PostgreSqlContainer(
      'postgis/postgis:16-3.4-alpine',
    )
      .withDatabase('govmob_test')
      .withUsername('test')
      .withPassword('test')
      .start();

    this.redisContainer = await new RedisContainer('redis:7.2-alpine').start();

    process.env.NODE_ENV = 'test';
    process.env.DATABASE_HOST = this.pgContainer.getHost();
    process.env.DATABASE_PORT = this.pgContainer.getPort().toString();
    process.env.DATABASE_USER = this.pgContainer.getUsername();
    process.env.DATABASE_PASSWORD = this.pgContainer.getPassword();
    process.env.DATABASE_NAME = this.pgContainer.getDatabase();
    process.env.REDIS_HOST = this.redisContainer.getHost();
    process.env.REDIS_PORT = this.redisContainer.getMappedPort(6379).toString();
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-8-chars';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-8-chars';
    process.env.MAPBOX_ACCESS_TOKEN = 'test-tokens';
    process.env.ONESIGNAL_APP_ID = 'test-app-id';
    process.env.ONESIGNAL_REST_API_KEY = 'test-api-key';
    process.env.GEO_MUNICIPIO_ID = 'DEFAULT_MUNICIPIO';
    process.env.ADMIN_SEED_CPF = '00301748136';
    process.env.SKIP_THROTTLER = 'true';
    process.env.SKIP_SEED = 'true';

    // 1. Setup DB Schema via synchronize(true)
    const setupDS = new DataSource({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [
        __dirname + '/../../src/**/*.entity.{js,ts}',
        __dirname + '/../../src/**/*.typeorm-entity.{js,ts}',
      ],
    });
    await setupDS.initialize();
    await setupDS.query('CREATE EXTENSION IF NOT EXISTS "postgis";');
    await setupDS.synchronize(true);

    // 2. Seed Test User via SQL
    const hashedPassword = await bcrypt.hash('GovMob@2026', 10);
    const cargoId = '00000000-0000-0000-0000-000000000001';
    const lotacaoId = '00000000-0000-0000-0000-000000000001';

    await setupDS.query(
      `INSERT INTO cargos (id, nome, peso_prioridade) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [cargoId, 'ADMINISTRADOR', 100],
    );
    await setupDS.query(
      `INSERT INTO lotacoes (id, nome) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [lotacaoId, 'TI'],
    );

    await setupDS.query(
      `
      INSERT INTO servidores (id, nome, cpf, email, telefone, cargo_id, lotacao_id, senha, status_conta, papeis, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      ON CONFLICT (cpf) DO NOTHING
    `,
      [
        '00000000-0000-5000-a000-000000000001',
        'Administrador Teste',
        '00301748136',
        'test@govmob.gov.br',
        '000000000',
        cargoId,
        lotacaoId,
        hashedPassword,
        'ativo',
        ['ADMIN', 'USUARIO'],
      ],
    );

    // 2b. Seed Motorista linked to this Servidor
    const motoristaId = '00000000-0000-6000-a000-000000000001';
    const servidorId = '00000000-0000-5000-a000-000000000001';
    await setupDS.query(
      `
      INSERT INTO motoristas (id, "servidorId", "cnhNumero", "cnhCategoria", "statusOperacional", ativo, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `,
      [motoristaId, servidorId, '1234567890', 'B', 'disponivel', true],
    );

    // 2c. Seed Veiculo
    const veiculoId = '00000000-0000-6000-b000-000000000001';
    await setupDS.query(
      `
      INSERT INTO veiculos (id, placa, modelo, ano, tipo, status, "motorista_ativo_id", quilometragem, ativo, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `,
      [
        veiculoId,
        'GOV-2026',
        'Sedan Executivo',
        2024,
        'sedan',
        'disponivel',
        motoristaId,
        0,
        true,
      ],
    );

    // 3. Seed Geofence (Municipio Boundary)
    // Seed a polygon covering São Paulo coordinates used in tests
    await setupDS.query(
      `
      INSERT INTO municipio_boundaries (municipio_id, geometria, created_at, updated_at)
      VALUES ($1, ST_GeomFromText($2, 4326), NOW(), NOW())
      ON CONFLICT (municipio_id) DO NOTHING
    `,
      [
        'DEFAULT_MUNICIPIO',
        'POLYGON((-46.7 -23.6, -46.6 -23.6, -46.6 -23.4, -46.7 -23.4, -46.7 -23.6))',
      ],
    );

    await setupDS.destroy();

    // 3. Start Nest App and listen on a real port for WebSockets
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('PushNotificationPort')
      .useValue(new MockPushNotificationService())
      .compile();

    this.app = moduleFixture.createNestApplication();
    await this.app.listen(0); // This is ACID: starts the real HTTP/WS server

    return {
      app: this.app,
      containerPg: this.pgContainer,
      containerRedis: this.redisContainer,
    };
  }

  async stop() {
    if (this.app) await this.app.close();
    if (this.pgContainer) await this.pgContainer.stop();
    if (this.redisContainer) await this.redisContainer.stop();
  }
}
