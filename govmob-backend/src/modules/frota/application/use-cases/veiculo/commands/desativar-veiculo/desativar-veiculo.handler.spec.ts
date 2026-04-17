import { Test, TestingModule } from '@nestjs/testing';
import { DesativarVeiculoHandler } from './desativar-veiculo.handler';
import { DesativarVeiculoCommand } from './desativar-veiculo.command';
// NotFoundError not used in this spec
import { Veiculo } from '../../../../../domain/aggregates/veiculo.aggregate';

describe('DesativarVeiculoHandler', () => {
  let handler: DesativarVeiculoHandler;
  let repository: any;

  beforeEach(async () => {
    repository = {
      findById: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DesativarVeiculoHandler,
        { provide: 'VeiculoRepositoryPort', useValue: repository },
      ],
    }).compile();

    handler = module.get<DesativarVeiculoHandler>(DesativarVeiculoHandler);
  });

  it('deve desativar o veículo com sucesso', async () => {
    const mockVeiculo = Veiculo.create('v1', {
      placa: 'ABC-123',
      modelo: 'Sedan',
      ano: 2024,
      tipo: 'sedan',
    });
    repository.findById.mockResolvedValue(mockVeiculo);

    const cmd = new DesativarVeiculoCommand('v1');
    const result = await handler.execute(cmd);

    expect(result.success).toBe(true);
    expect(mockVeiculo.ativo).toBe(false);
    expect(repository.save).toHaveBeenCalled();
  });
});
