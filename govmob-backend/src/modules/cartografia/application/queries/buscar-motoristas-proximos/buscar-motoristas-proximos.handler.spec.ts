import { Test, TestingModule } from '@nestjs/testing';
import {
  BuscarMotoristasProximosHandler,
  BuscarMotoristasProximosQuery,
} from './buscar-motoristas-proximos.handler';
import { RedisService } from '../../../../../shared-kernel/infrastructure/redis/redis.service';

describe('BuscarMotoristasProximosHandler', () => {
  let handler: BuscarMotoristasProximosHandler;
  let redis: any;

  beforeEach(async () => {
    redis = {
      geoSearch: jest.fn(),
      geoPos: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuscarMotoristasProximosHandler,
        { provide: RedisService, useValue: redis },
        { provide: 'PostGISPort', useValue: { stDistance: jest.fn() } },
      ],
    }).compile();

    handler = module.get<BuscarMotoristasProximosHandler>(
      BuscarMotoristasProximosHandler,
    );
  });

  it('deve retornar lista de motoristas próximos via Redis', async () => {
    redis.geoSearch.mockResolvedValue(['m1']);
    redis.geoPos.mockResolvedValue({ lat: -23.1, lng: -46.1 });

    const query = new BuscarMotoristasProximosQuery(-23, -46, 5000);
    const result = await handler.execute(query);

    expect(result).toHaveLength(1);
    expect(redis.geoSearch).toHaveBeenCalled();
  });
});
