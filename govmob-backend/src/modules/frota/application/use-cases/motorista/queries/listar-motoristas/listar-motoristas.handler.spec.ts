import { Test, TestingModule } from '@nestjs/testing';
import { ListarMotoristasHandler } from './listar-motoristas.handler';
import { ListarMotoristasQuery } from './listar-motoristas.query';

describe('ListarMotoristasHandler', () => {
  let handler: ListarMotoristasHandler;
  let repository: any;

  beforeEach(async () => {
    repository = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListarMotoristasHandler,
        { provide: 'MotoristaRepositoryPort', useValue: repository },
      ],
    }).compile();

    handler = module.get<ListarMotoristasHandler>(ListarMotoristasHandler);
  });

  it('deve retornar lista de motoristas vazia', async () => {
    repository.findAll.mockResolvedValue([]);
    const query = new ListarMotoristasQuery();

    const result = await handler.execute(query);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(0);
  });

  it('deve retornar lista com motoristas', async () => {
    repository.findAll.mockResolvedValue([
      {
        id: 'm1',
        servidorId: 's1',
        cnhNumero: '1',
        cnhCategoria: 'A',
        status: 'DISPONIVEL',
        ativo: true,
      },
    ]);
    const query = new ListarMotoristasQuery();

    const result = await handler.execute(query);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });
});
