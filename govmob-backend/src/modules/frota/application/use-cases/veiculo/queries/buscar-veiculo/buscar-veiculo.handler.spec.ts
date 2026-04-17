import { Test, TestingModule } from '@nestjs/testing';
import { BuscarVeiculoHandler } from './buscar-veiculo.handler';
import { BuscarVeiculoQuery } from './buscar-veiculo.query';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import { Veiculo } from '../../../../../domain/aggregates/veiculo.aggregate';

describe('BuscarVeiculoHandler', () => {
  let handler: BuscarVeiculoHandler;
  let repository: any;

  beforeEach(async () => {
    repository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuscarVeiculoHandler,
        { provide: 'VeiculoRepositoryPort', useValue: repository },
      ],
    }).compile();

    handler = module.get<BuscarVeiculoHandler>(BuscarVeiculoHandler);
  });

  it('deve lançar NotFoundError se o veículo não existir', async () => {
    repository.findById.mockResolvedValue(null);
    const query = new BuscarVeiculoQuery('v1');

    await expect(handler.execute(query)).rejects.toThrow(NotFoundError);
  });

  it('deve retornar veículo se encontrado', async () => {
    const mockVeiculo = Veiculo.create('v1', {
      placa: 'ABC-123',
      modelo: 'Sedan',
      ano: 2024,
      tipo: 'sedan',
    });
    repository.findById.mockResolvedValue(mockVeiculo);

    const query = new BuscarVeiculoQuery('v1');
    const result = await handler.execute(query);

    expect(result.success).toBe(true);
    expect(result.data.id).toBe('v1');
  });
});
