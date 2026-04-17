import { Test, TestingModule } from '@nestjs/testing';
import {
  RecusarCorridaHandler,
  RecusarCorridaCommand,
} from './recusar-corrida.handler';
// NotFoundError not used in this spec
import { RedisService } from '../../../../../shared-kernel/infrastructure/redis/redis.service';
import { Corrida } from '../../../domain/aggregates/corrida/corrida.aggregate';
import { Coordenada } from '../../../../cartografia/domain/value-objects/coordenada.vo';
import { CorridaStatus } from '../../../domain/aggregates/corrida/corrida.state';

describe('RecusarCorridaHandler', () => {
  let handler: RecusarCorridaHandler;
  let corridaRepo: any;
  let redis: any;

  beforeEach(async () => {
    corridaRepo = {
      findById: jest.fn(),
      save: jest.fn(),
    };
    redis = {
      getClient: jest.fn().mockReturnValue({
        incr: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(true),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecusarCorridaHandler,
        { provide: 'CorridaRepositoryPort', useValue: corridaRepo },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    handler = module.get<RecusarCorridaHandler>(RecusarCorridaHandler);
  });

  it('deve adicionar o motorista à lista de recusas da corrida e registrar no Redis', async () => {
    const mockCorrida = Corrida.reconstitute('corrida-1', {
      status: CorridaStatus.SOLICITADA,
      passageiroId: 'p-1',
      origem: Coordenada.criar(0, 0),
      destino: Coordenada.criar(1, 1),
      motivoServico: 'Teste',
      prioridadeNivel: 1,
      timestamps: { solicitadaEm: new Date() },
    } as any);
    corridaRepo.findById.mockResolvedValue(mockCorrida);

    const cmd = new RecusarCorridaCommand('corrida-1', 'motorista-1');

    await handler.execute(cmd);

    expect(corridaRepo.save).toHaveBeenCalled();
    expect(redis.getClient).toHaveBeenCalled();
  });
});
