import { Test, TestingModule } from '@nestjs/testing';
import {
  CancelarCorridaHandler,
  CancelarCorridaCommand,
} from './cancelar-corrida.handler';
// NotFoundError not used in this spec
import { TransactionManager } from '../../../../../shared-kernel/infrastructure/persistence/transaction.manager';
import { Corrida } from '../../../domain/aggregates/corrida/corrida.aggregate';
import { Coordenada } from '../../../../cartografia/domain/value-objects/coordenada.vo';
import { CorridaStatus } from '../../../domain/aggregates/corrida/corrida.state';

describe('CancelarCorridaHandler', () => {
  let handler: CancelarCorridaHandler;
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
        CancelarCorridaHandler,
        { provide: 'CorridaRepositoryPort', useValue: corridaRepo },
        { provide: TransactionManager, useValue: transactionManager },
      ],
    }).compile();

    handler = module.get<CancelarCorridaHandler>(CancelarCorridaHandler);
  });

  it('deve cancelar corrida com sucesso se o solicitante for o passageiro', async () => {
    const mockCorrida = Corrida.reconstitute('corrida-1', {
      status: CorridaStatus.SOLICITADA,
      passageiroId: 'p-1',
      origem: Coordenada.criar(0, 0),
      destino: Coordenada.criar(1, 1),
      rota: [],
      motivoServico: 'Teste',
      prioridadeNivel: 1,
      timestamps: { solicitadaEm: new Date() },
    } as any);
    corridaRepo.findById.mockResolvedValue(mockCorrida);

    const cmd = new CancelarCorridaCommand(
      'corrida-1',
      'p-1',
      'Mudei de ideia',
    );

    await handler.execute(cmd);

    expect(mockCorrida.status).toBe(CorridaStatus.CANCELADA);
    expect(corridaRepo.save).toHaveBeenCalled();
  });

  it('deve lançar erro se o solicitante não pertencer à corrida', async () => {
    const mockCorrida = Corrida.reconstitute('corrida-1', {
      status: CorridaStatus.ACEITA,
      passageiroId: 'p-1',
      motoristaId: 'm-1',
      origem: Coordenada.criar(0, 0),
      destino: Coordenada.criar(1, 1),
      rota: [],
      motivoServico: 'Teste',
      prioridadeNivel: 1,
      timestamps: { solicitadaEm: new Date(), aceitaEm: new Date() },
    } as any);
    corridaRepo.findById.mockResolvedValue(mockCorrida);

    const cmd = new CancelarCorridaCommand('corrida-1', 'estranho', 'Invasão');

    // O aggregate lança erro se o solicitante não for o passageiro nem o motorista
    await expect(handler.execute(cmd)).rejects.toThrow();
  });
});
