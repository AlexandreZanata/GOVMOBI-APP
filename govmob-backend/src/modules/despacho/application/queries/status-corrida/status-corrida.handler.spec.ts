import { Test, TestingModule } from '@nestjs/testing';
import {
  StatusCorridaHandler,
  StatusCorridaQuery,
} from './status-corrida.handler';
// NotFoundError not used in this spec
import { RedisService } from '../../../../../shared-kernel/infrastructure/redis/redis.service';
import { CorridaStatus } from '../../../domain/aggregates/corrida/corrida.state';

describe('StatusCorridaHandler', () => {
  let handler: StatusCorridaHandler;
  let corridaRepo: any;
  let redis: any;

  beforeEach(async () => {
    corridaRepo = {
      findById: jest.fn(),
    };
    redis = {
      get: jest.fn(),
      hGetAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatusCorridaHandler,
        { provide: 'CorridaRepositoryPort', useValue: corridaRepo },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    handler = module.get<StatusCorridaHandler>(StatusCorridaHandler);
  });

  it('deve retornar o status atual a partir do cache se disponível', async () => {
    redis.hGetAll.mockResolvedValue({ status: CorridaStatus.ACEITA });

    const query = new StatusCorridaQuery('c1');
    const result = await handler.execute(query);

    expect(result).toHaveProperty('status', CorridaStatus.ACEITA);
  });

  it('deve retornar o status atual a partir do repositório se não estiver no cache', async () => {
    redis.hGetAll.mockResolvedValue(null);
    corridaRepo.findById.mockResolvedValue({
      id: 'c1',
      status: CorridaStatus.SOLICITADA,
    });

    const query = new StatusCorridaQuery('c1');
    const result = await handler.execute(query);

    expect(result).toHaveProperty('status', CorridaStatus.SOLICITADA);
  });
});
