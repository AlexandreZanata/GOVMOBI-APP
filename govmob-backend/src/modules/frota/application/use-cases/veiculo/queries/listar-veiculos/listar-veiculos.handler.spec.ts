import { Test, TestingModule } from '@nestjs/testing';
import { ListarVeiculosHandler } from './listar-veiculos.handler';
import { ListarVeiculosQuery } from './listar-veiculos.query';

describe('ListarVeiculosHandler', () => {
  let handler: ListarVeiculosHandler;
  let repository: any;

  beforeEach(async () => {
    repository = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListarVeiculosHandler,
        { provide: 'VeiculoRepositoryPort', useValue: repository },
      ],
    }).compile();

    handler = module.get<ListarVeiculosHandler>(ListarVeiculosHandler);
  });

  it('deve retornar lista de veículos', async () => {
    repository.findAll.mockResolvedValue([
      {
        id: 'v1',
        placa: 'ABC-123',
        modelo: 'Sedan',
        ano: 2024,
        tipo: 'sedan',
        ativo: true,
      },
    ]);
    const query = new ListarVeiculosQuery();

    const result = await handler.execute(query);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });
});
