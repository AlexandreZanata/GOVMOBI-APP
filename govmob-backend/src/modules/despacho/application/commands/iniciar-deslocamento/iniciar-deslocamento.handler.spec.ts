import { Test, TestingModule } from '@nestjs/testing';
import {
  IniciarDeslocamentoHandler,
  IniciarDeslocamentoCommand,
} from './iniciar-deslocamento.handler';
import { ForbiddenError } from '../../../../../shared-kernel/errors';
import { TransactionManager } from '../../../../../shared-kernel/infrastructure/persistence/transaction.manager';
import { Corrida } from '../../../domain/aggregates/corrida/corrida.aggregate';
import { Coordenada } from '../../../../cartografia/domain/value-objects/coordenada.vo';
import { CorridaStatus } from '../../../domain/aggregates/corrida/corrida.state';

describe('IniciarDeslocamentoHandler', () => {
  let handler: IniciarDeslocamentoHandler;
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
        IniciarDeslocamentoHandler,
        { provide: 'CorridaRepositoryPort', useValue: corridaRepo },
        { provide: TransactionManager, useValue: transactionManager },
      ],
    }).compile();

    handler = module.get<IniciarDeslocamentoHandler>(
      IniciarDeslocamentoHandler,
    );
  });

  it('deve iniciar deslocamento com sucesso se o motorista for o correto e a corrida estiver ACEITA', async () => {
    const mockCorrida = Corrida.reconstitute('corrida-1', {
      status: CorridaStatus.ACEITA,
      passageiroId: 'p-1',
      motoristaId: 'motorista-1',
      origem: Coordenada.criar(0, 0),
      destino: Coordenada.criar(1, 1),
      rota: [],
      motivoServico: 'Teste',
      prioridadeNivel: 1,
      timestamps: { solicitadaEm: new Date(), aceitaEm: new Date() },
    } as any);
    corridaRepo.findById.mockResolvedValue(mockCorrida);

    const cmd = new IniciarDeslocamentoCommand('corrida-1', 'motorista-1');

    await handler.execute(cmd);

    expect(mockCorrida.status).toBe(CorridaStatus.EM_ROTA);
    expect(corridaRepo.save).toHaveBeenCalled();
  });

  it('deve lançar ForbiddenError se o motorista não for o atribuído à corrida', async () => {
    const mockCorrida = Corrida.reconstitute('corrida-1', {
      status: CorridaStatus.ACEITA,
      passageiroId: 'p-1',
      motoristaId: 'outro-motorista',
      origem: Coordenada.criar(0, 0),
      destino: Coordenada.criar(1, 1),
      rota: [],
      motivoServico: 'Teste',
      prioridadeNivel: 1,
      timestamps: { solicitadaEm: new Date(), aceitaEm: new Date() },
    } as any);
    corridaRepo.findById.mockResolvedValue(mockCorrida);

    const cmd = new IniciarDeslocamentoCommand('corrida-1', 'motorista-1');

    await expect(handler.execute(cmd)).rejects.toThrow(ForbiddenError);
  });
});
