import { Test, TestingModule } from '@nestjs/testing';
import {
  ConfirmarEmbarqueHandler,
  ConfirmarEmbarqueCommand,
} from './confirmar-embarque.handler';
// NotFoundError not used in this spec
import { TransactionManager } from '../../../../../shared-kernel/infrastructure/persistence/transaction.manager';
import { Corrida } from '../../../domain/aggregates/corrida/corrida.aggregate';
import { Coordenada } from '../../../../cartografia/domain/value-objects/coordenada.vo';
import { CorridaStatus } from '../../../domain/aggregates/corrida/corrida.state';

describe('ConfirmarEmbarqueHandler', () => {
  let handler: ConfirmarEmbarqueHandler;
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
        ConfirmarEmbarqueHandler,
        { provide: 'CorridaRepositoryPort', useValue: corridaRepo },
        { provide: TransactionManager, useValue: transactionManager },
      ],
    }).compile();

    handler = module.get<ConfirmarEmbarqueHandler>(ConfirmarEmbarqueHandler);
  });

  it('deve confirmar embarque se a corrida estiver no status correto e o motorista for o atribuído', async () => {
    const mockCorrida = Corrida.reconstitute('corrida-1', {
      status: CorridaStatus.EM_ROTA,
      passageiroId: 'p-1',
      motoristaId: 'motorista-1',
      origem: Coordenada.criar(0, 0),
      destino: Coordenada.criar(1, 1),
      motivoServico: 'Teste',
      prioridadeNivel: 1,
      timestamps: {
        solicitadaEm: new Date(),
        aceitaEm: new Date(),
        iniciadaEm: new Date(),
      },
    } as any);
    corridaRepo.findById.mockResolvedValue(mockCorrida);

    const cmd = new ConfirmarEmbarqueCommand('corrida-1', 'motorista-1', 0, 0);

    await handler.execute(cmd);

    expect(mockCorrida.timestamps.embarqueEm).toBeDefined();
    expect(corridaRepo.save).toHaveBeenCalled();
  });
});
