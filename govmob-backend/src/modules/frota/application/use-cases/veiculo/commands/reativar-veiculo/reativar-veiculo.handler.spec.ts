import { Test, TestingModule } from '@nestjs/testing';
import { ReativarVeiculoHandler } from './reativar-veiculo.handler';
import { ReativarVeiculoCommand } from './reativar-veiculo.command';
// NotFoundError and ConflictError not used in this spec
import {
  StatusVeiculo,
  Veiculo,
} from '../../../../../domain/aggregates/veiculo.aggregate';

describe('ReativarVeiculoHandler', () => {
  let handler: ReativarVeiculoHandler;
  let repository: any;

  beforeEach(async () => {
    repository = {
      findById: jest.fn(),
      findByPlaca: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReativarVeiculoHandler,
        { provide: 'VeiculoRepositoryPort', useValue: repository },
      ],
    }).compile();

    handler = module.get<ReativarVeiculoHandler>(ReativarVeiculoHandler);
  });

  it('deve reativar o veículo com sucesso', async () => {
    const mockVeiculo = Veiculo.reconstitute('v-1', {
      placa: 'ABC1D23',
      modelo: 'Sedan',
      ano: 2022,
      tipo: 'CARRO',
      status: StatusVeiculo.DISPONIVEL,
      quilometragem: 1000,
      documentos: {},
      ativo: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(),
    });
    repository.findById.mockResolvedValue(mockVeiculo);
    repository.findByPlaca.mockResolvedValue(null);

    const cmd = new ReativarVeiculoCommand('v-1');
    await handler.execute(cmd);

    expect(mockVeiculo.ativo).toBe(true);
    expect(mockVeiculo.deletedAt).toBeNull();
    expect(repository.save).toHaveBeenCalled();
  });
});
