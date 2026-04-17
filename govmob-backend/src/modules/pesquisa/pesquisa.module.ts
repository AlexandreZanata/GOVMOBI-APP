import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PesquisaController } from './interface/http/pesquisa.controller';
import { PesquisaService } from './application/services/pesquisa.service';
import { MapboxClient } from './infrastructure/mapbox/mapbox.client';
import { RedisModule } from '../../shared-kernel/infrastructure/redis/redis.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    RedisModule,
  ],
  controllers: [PesquisaController],
  providers: [PesquisaService, MapboxClient],
  exports: [PesquisaService],
})
export class PesquisaModule {}
