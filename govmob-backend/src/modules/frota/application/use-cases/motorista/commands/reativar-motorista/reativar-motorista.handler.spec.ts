import { Test, TestingModule } from '@nestjs/testing';
import { ReativarMotoristaHandler } from './reativar-motorista.handler';
import { ReativarMotoristaCommand } from './reativar-motorista.command';
// NotFoundError and ConflictError not used in this spec
import {
  Motorista,
  StatusOperacional,
} from '../../../../../domain/aggregates/motorista.aggregate';

describe('ReativarMotoristaHandler', () => {
  let handler: ReativarMotoristaHandler;
  let repository: any;

  beforeEach(async () => {
    repository = {
      findById: jest.fn(),
      findByServidorId: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReativarMotoristaHandler,
        { provide: 'MotoristaRepositoryPort', useValue: repository },
      ],
    }).compile();

    handler = module.get<ReativarMotoristaHandler>(ReativarMotoristaHandler);
  });

  it('deve reativar o motorista com sucesso', async () => {
    const mockMotorista = Motorista.reconstitute('m-1', {
      servidorId: 's-1',
      cnhNumero: '123',
      cnhCategoria: 'AD',
      statusOperacional: StatusOperacional.OFFLINE,
      ativo: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(),
    });
    repository.findById.mockResolvedValue(mockMotorista);
    repository.findByServidorId.mockResolvedValue(null);

    const cmd = new ReativarMotoristaCommand('m-1');
    await handler.execute(cmd);

    expect(mockMotorista.ativo).toBe(true);
    expect(mockMotorista.deletedAt).toBeNull();
    expect(repository.save).toHaveBeenCalled();
  });
});
