import { Test, TestingModule } from '@nestjs/testing';
import { EditarVeiculoHandler } from './editar-veiculo.handler';
import { EditarVeiculoCommand } from './editar-veiculo.command';
// NotFoundError not used in this spec
import { Veiculo } from '../../../../../domain/aggregates/veiculo.aggregate';

describe('EditarVeiculoHandler', () => {
  let handler: EditarVeiculoHandler;
  let repository: any;

  beforeEach(async () => {
    repository = {
      findById: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EditarVeiculoHandler,
        { provide: 'VeiculoRepositoryPort', useValue: repository },
      ],
    }).compile();

    handler = module.get<EditarVeiculoHandler>(EditarVeiculoHandler);
  });

  it('deve editar dados do veículo com sucesso', async () => {
    const mockVeiculo = Veiculo.create('v1', {
      placa: 'ABC-123',
      modelo: 'Sedan',
      ano: 2024,
      tipo: 'sedan',
    });
    repository.findById.mockResolvedValue(mockVeiculo);

    const cmd = new EditarVeiculoCommand({
      id: 'v1',
      modelo: 'SUV',
      ano: 2025,
    });
    const result = await handler.execute(cmd);

    expect(result.success).toBe(true);
    expect(mockVeiculo.modelo).toBe('SUV');
    expect(mockVeiculo.ano).toBe(2025);
    expect(repository.save).toHaveBeenCalled();
  });
});
