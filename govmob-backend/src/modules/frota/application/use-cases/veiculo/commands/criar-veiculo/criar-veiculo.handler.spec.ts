import { Test, TestingModule } from '@nestjs/testing';
import { CriarVeiculoHandler } from './criar-veiculo.handler';
import { CriarVeiculoCommand } from './criar-veiculo.command';
import { ConflictError } from '../../../../../../../shared-kernel/errors/conflict.error';
// Veiculo not used directly in this spec

describe('CriarVeiculoHandler', () => {
  let handler: CriarVeiculoHandler;
  let repository: any;

  beforeEach(async () => {
    repository = {
      findByPlaca: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CriarVeiculoHandler,
        { provide: 'VeiculoRepositoryPort', useValue: repository },
      ],
    }).compile();

    handler = module.get<CriarVeiculoHandler>(CriarVeiculoHandler);
  });

  it('deve lançar ConflictError se a placa já estiver cadastrada', async () => {
    repository.findByPlaca.mockResolvedValue({ id: 'v1' });
    const cmd = new CriarVeiculoCommand({
      placa: 'ABC-123',
      modelo: 'Sedan',
      ano: 2024,
    });

    await expect(handler.execute(cmd)).rejects.toThrow(ConflictError);
  });

  it('deve criar veículo com sucesso', async () => {
    repository.findByPlaca.mockResolvedValue(null);
    const cmd = new CriarVeiculoCommand({
      placa: 'ABC-123',
      modelo: 'Sedan',
      ano: 2024,
    });

    const result = await handler.execute(cmd);

    expect(result.success).toBe(true);
    expect(repository.save).toHaveBeenCalled();
  });
});
