import { Test, TestingModule } from '@nestjs/testing';
import { DesativarMotoristaHandler } from './desativar-motorista.handler';
import { DesativarMotoristaCommand } from './desativar-motorista.command';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import { Motorista } from '../../../../../domain/aggregates/motorista.aggregate';

describe('DesativarMotoristaHandler', () => {
  let handler: DesativarMotoristaHandler;
  let repository: any;

  beforeEach(async () => {
    repository = {
      findById: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DesativarMotoristaHandler,
        { provide: 'MotoristaRepositoryPort', useValue: repository },
      ],
    }).compile();

    handler = module.get<DesativarMotoristaHandler>(DesativarMotoristaHandler);
  });

  it('deve lançar NotFoundError se o motorista não existir', async () => {
    repository.findById.mockResolvedValue(null);
    const cmd = new DesativarMotoristaCommand('m1');

    await expect(handler.execute(cmd)).rejects.toThrow(NotFoundError);
  });

  it('deve desativar o motorista com sucesso', async () => {
    const mockMotorista = Motorista.create('m1', {
      servidorId: 's1',
      cnhNumero: '123',
      cnhCategoria: 'AB',
    });
    repository.findById.mockResolvedValue(mockMotorista);

    const cmd = new DesativarMotoristaCommand('m1');
    const result = await handler.execute(cmd);

    expect(result.success).toBe(true);
    expect(mockMotorista.ativo).toBe(false);
    expect(repository.save).toHaveBeenCalled();
  });
});
