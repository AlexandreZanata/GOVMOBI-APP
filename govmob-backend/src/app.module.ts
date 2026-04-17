import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/interface/http/guards/jwt-auth.guard';
import appConfig from './config/app.config';

import { IdentidadeModule } from './modules/identidade/identidade.module';
import { FrotaModule } from './modules/frota/frota.module';
import { CartografiaModule } from './modules/cartografia/cartografia.module';
import { DespachoModule } from './modules/despacho/despacho.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { NotificacaoModule } from './modules/notificacao/notificacao.module';
import { AuthModule } from './modules/auth/auth.module';
import { PesquisaModule } from './modules/pesquisa/pesquisa.module';
import { RedisModule } from './shared-kernel/infrastructure/redis/redis.module';
import { OutboxModule } from './shared-kernel/infrastructure/outbox/outbox.module';
import { AllExceptionsFilter } from './shared-kernel/errors/all-exceptions.filter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerRedisStorageService } from './shared-kernel/infrastructure/throttler/throttler-redis-storage.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: 60000,
            limit: config.get<boolean>('config.app.skipThrottle')
              ? 999999
              : config.get('config.app.nodeEnv') === 'test'
                ? 999999
                : 20,
          },
        ],
        storage: new ThrottlerRedisStorageService({
          host: config.get<string>('config.redis.host'),
          port: config.get<number>('config.redis.port'),
        }),
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('config.database.host'),
        port: config.get<number>('config.database.port'),
        username: config.get<string>('config.database.user'),
        password: config.get<string>('config.database.password'),
        database: config.get<string>('config.database.name'),
        schema: config.get<string>('config.database.schema'),
        ssl: config.get<boolean>('config.database.ssl'),
        extra: {
          max: config.get<number>('config.database.poolMax'),
          min: config.get<number>('config.database.poolMin'),
        },
        autoLoadEntities: true,
        synchronize: false, // Controlado pelo TestEnvironment ou Migrations
      }),
    }),
    ScheduleModule.forRoot(),
    IdentidadeModule,
    FrotaModule,
    CartografiaModule,
    DespachoModule,
    AuditoriaModule,
    NotificacaoModule,
    AuthModule,
    PesquisaModule,
    RedisModule,
    OutboxModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
