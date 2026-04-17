import { Test, TestingModule } from '@nestjs/testing';
import { ListarCorridasHandler, ListarCorridasQuery } from './listar-corridas.handler';
import { CorridaStatus } from '../../../domain/aggregates/corrida/corrida.state';

describe('ListarCorridasHandler', () => {
  let handler: ListarCorridasHandler;
  let corridaRepo: any;

  beforeEach(async () => {
    corridaRepo = {
      findPaginated: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListarCorridasHandler,
        { provide: 'CorridaRepositoryPort', useValue: corridaRepo },
      ],
    }).compile();

    handler = module.get<ListarCorridasHandler>(ListarCorridasHandler);
  });

  it('deve filtrar por passageiroId e status CONCLUIDA por padrão para PASSAGEIRO', async () => {
    const query = new ListarCorridasQuery('user-1', ['USUARIO']);
    await handler.execute(query);

    expect(corridaRepo.findPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        passageiroId: 'user-1',
        status: CorridaStatus.CONCLUIDA,
      }),
      expect.any(Object),
    );
  });

  it('deve filtrar por motoristaId e status CONCLUIDA por padrão para MOTORISTA', async () => {
    const query = new ListarCorridasQuery('user-1', ['USUARIO'], 'driver-1');
    await handler.execute(query);

    expect(corridaRepo.findPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        motoristaId: 'driver-1',
        status: CorridaStatus.CONCLUIDA,
      }),
      expect.any(Object),
    );
  });

  it('não deve aplicar filtros obrigatórios para ADMIN', async () => {
    const query = new ListarCorridasQuery('admin-1', ['ADMIN']);
    await handler.execute(query);

    expect(corridaRepo.findPaginated).toHaveBeenCalledWith(
      {}, // Filtros vazios para admin (a menos que especificado)
      expect.any(Object),
    );
  });

  it('deve permitir que ADMIN filtre por qualquer status', async () => {
    const query = new ListarCorridasQuery('admin-1', ['ADMIN'], undefined, 1, 10, CorridaStatus.EM_ROTA);
    await handler.execute(query);

    expect(corridaRepo.findPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        status: CorridaStatus.EM_ROTA,
      }),
      expect.any(Object),
    );
  });
});
