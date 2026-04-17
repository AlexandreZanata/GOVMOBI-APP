import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MunicipioBoundaryEntity } from './infrastructure/persistence/municipio-boundary.entity';
import { CartografiaController } from './interface/http/cartografia.controller';
import { PostGISService } from './infrastructure/postgis/postgis.service';
import { MunicipioBoundaryRepository } from './infrastructure/postgis/municipio-boundary.repository';
import { GeoCacheRedis } from './infrastructure/redis/geo-cache.redis';
import { ValidarCoordenadaHandler } from './application/queries/validar-coordenada/validar-coordenada.handler';
import { CalcularDistanciaHandler } from './application/queries/calcular-distancia/calcular-distancia.handler';
import { BuscarMotoristasProximosHandler } from './application/queries/buscar-motoristas-proximos/buscar-motoristas-proximos.handler';

@Module({
  imports: [TypeOrmModule.forFeature([MunicipioBoundaryEntity])],
  controllers: [CartografiaController],
  providers: [
    { provide: 'PostGISPort', useClass: PostGISService },
    PostGISService,
    MunicipioBoundaryRepository,
    GeoCacheRedis,
    ValidarCoordenadaHandler,
    CalcularDistanciaHandler,
    BuscarMotoristasProximosHandler,
  ],
  exports: [
    'PostGISPort',
    PostGISService,
    MunicipioBoundaryRepository,
    BuscarMotoristasProximosHandler,
  ],
})
export class CartografiaModule {}
