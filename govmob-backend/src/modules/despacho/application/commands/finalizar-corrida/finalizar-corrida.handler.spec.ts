import { Test, TestingModule } from '@nestjs/testing';
import {
  FinalizarCorridaHandler,
  FinalizarCorridaCommand,
} from './finalizar-corrida.handler';
// NotFoundError not used in this spec
import { TransactionManager } from '../../../../../shared-kernel/infrastructure/persistence/transaction.manager';
import { Corrida } from '../../../domain/aggregates/corrida/corrida.aggregate';
import { Coordenada } from '../../../../cartografia/domain/value-objects/coordenada.vo';
import { CorridaStatus } from '../../../domain/aggregates/corrida/corrida.state';

describe('FinalizarCorridaHandler', () => {
  let handler: FinalizarCorridaHandler;
  let corridaRepo: any;
  let transactionManager: any;

  beforeEach(async () => {
    corridaRepo = {
      findById: jest.fn(),
      save: jest.fn(),
    };
    transactionManager = {
      run: jest.fn((cb) => cb({ save: jest.fn() })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinalizarCorridaHandler,
        { provide: 'CorridaRepositoryPort', useValue: corridaRepo },
        { provide: TransactionManager, useValue: transactionManager },
      ],
    }).compile();

    handler = module.get<FinalizarCorridaHandler>(FinalizarCorridaHandler);
  });

  it('deve finalizar corrida se estiver EM_ROTA e o motorista for o correto', async () => {
    const mockCorrida = Corrida.reconstitute('corrida-1', {
      status: CorridaStatus.EM_ROTA,
      passageiroId: 'p-1',
      motoristaId: 'motorista-1',
      origem: Coordenada.criar(0, 0),
      destino: Coordenada.criar(1, 1),
      rota: [], // Essential for iterability
      motivoServico: 'Teste',
      prioridadeNivel: 1,
      timestamps: {
        solicitadaEm: new Date(),
        aceitaEm: new Date(),
        iniciadaEm: new Date(),
        embarqueEm: new Date(),
      },
    } as any);
    corridaRepo.findById.mockResolvedValue(mockCorrida);

    const cmd = new FinalizarCorridaCommand('corrida-1', 'motorista-1', 1.1, 2.2);

    await handler.execute(cmd);

    expect(mockCorrida.status).toBe(CorridaStatus.CONCLUIDA);
    expect(corridaRepo.save).toHaveBeenCalled();
  });
});
