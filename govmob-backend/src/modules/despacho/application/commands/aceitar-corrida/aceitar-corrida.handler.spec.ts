import { Test, TestingModule } from '@nestjs/testing';
import {
  AceitarCorridaHandler,
  AceitarCorridaCommand,
} from './aceitar-corrida.handler';
import { ConflictError } from '../../../../../shared-kernel/errors';
import { TransactionManager } from '../../../../../shared-kernel/infrastructure/persistence/transaction.manager';
import { RedisService } from '../../../../../shared-kernel/infrastructure/redis/redis.service';
import { Corrida } from '../../../domain/aggregates/corrida/corrida.aggregate';
import { Coordenada } from '../../../../cartografia/domain/value-objects/coordenada.vo';
import { CorridaStatus } from '../../../domain/aggregates/corrida/corrida.state';
import { PosicaoRedis } from '../../../infrastructure/redis/posicao.redis';

describe('AceitarCorridaHandler', () => {
  let handler: AceitarCorridaHandler;
  let corridaRepo: any;
  let redis: any;
  let transactionManager: any;
  let posicaoRedis: any;

  beforeEach(async () => {
    corridaRepo = {
      findById: jest.fn(),
      save: jest.fn(),
      findAtivaByMotoristaId: jest.fn(),
      findAtivaByVeiculoId: jest.fn(),
    };
    redis = {
      setNX: jest.fn(),
      del: jest.fn(),
      getClient: jest.fn().mockReturnValue({
        incr: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(true),
      }),
    };
    transactionManager = {
      run: jest.fn((cb) => cb({ save: jest.fn() })),
    };
    posicaoRedis = {
      removerDisponivel: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AceitarCorridaHandler,
        { provide: 'CorridaRepositoryPort', useValue: corridaRepo },
        { provide: RedisService, useValue: redis },
        { provide: TransactionManager, useValue: transactionManager },
        { provide: PosicaoRedis, useValue: posicaoRedis },
      ],
    }).compile();

    handler = module.get<AceitarCorridaHandler>(AceitarCorridaHandler);
  });

  it('deve lançar ConflictError se o motorista já tiver outra corrida ativa', async () => {
    redis.setNX.mockResolvedValue(true);
    // Mock findById to avoid NotFoundError
    corridaRepo.findById.mockResolvedValue({
      id: 'corrida-1',
      status: CorridaStatus.SOLICITADA,
    });
    corridaRepo.findAtivaByMotoristaId.mockResolvedValue({
      id: 'outra-corrida',
    });

    const cmd = new AceitarCorridaCommand(
      'corrida-1',
      'motorista-1',
      'veiculo-1',
    );

    await expect(handler.execute(cmd)).rejects.toThrow(ConflictError);
  });

  it('deve aceitar corrida com sucesso, salvar e remover do índice de disponíveis', async () => {
    redis.setNX.mockResolvedValue(true);
    corridaRepo.findAtivaByMotoristaId.mockResolvedValue(null);
    corridaRepo.findAtivaByVeiculoId.mockResolvedValue(null);

    const mockCorrida = Corrida.reconstitute('corrida-1', {
      status: CorridaStatus.AGUARDANDO_ACEITE,
      passageiroId: 'p-1',
      origem: Coordenada.criar(0, 0),
      destino: Coordenada.criar(1, 1),
      rota: [],
      motivoServico: 'Teste',
      prioridadeNivel: 1,
      timestamps: { solicitadaEm: new Date() },
    } as any);
    corridaRepo.findById.mockResolvedValue(mockCorrida);

    const cmd = new AceitarCorridaCommand(
      'corrida-1',
      'motorista-1',
      'veiculo-1',
    );

    await handler.execute(cmd);

    expect(corridaRepo.save).toHaveBeenCalled();
    expect(posicaoRedis.removerDisponivel).toHaveBeenCalledWith('motorista-1');
  });
});
