import { Test, TestingModule } from '@nestjs/testing';
import { EditarMotoristaHandler } from './editar-motorista.handler';
import { EditarMotoristaCommand } from './editar-motorista.command';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import { Motorista } from '../../../../../domain/aggregates/motorista.aggregate';

describe('EditarMotoristaHandler', () => {
  let handler: EditarMotoristaHandler;
  let repository: any;

  beforeEach(async () => {
    repository = {
      findById: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EditarMotoristaHandler,
        { provide: 'MotoristaRepositoryPort', useValue: repository },
      ],
    }).compile();

    handler = module.get<EditarMotoristaHandler>(EditarMotoristaHandler);
  });

  it('deve lançar NotFoundError se o motorista não existir', async () => {
    repository.findById.mockResolvedValue(null);
    const cmd = new EditarMotoristaCommand({ id: 'm1', cnhNumero: '999' });

    await expect(handler.execute(cmd)).rejects.toThrow(NotFoundError);
  });

  it('deve editar dados do motorista com sucesso', async () => {
    const mockMotorista = Motorista.create('m1', {
      servidorId: 's1',
      cnhNumero: '123',
      cnhCategoria: 'AB',
    });
    repository.findById.mockResolvedValue(mockMotorista);

    const cmd = new EditarMotoristaCommand({
      id: 'm1',
      cnhNumero: '999',
      cnhCategoria: 'D',
    });
    const result = await handler.execute(cmd);

    expect(result.success).toBe(true);
    expect(mockMotorista.cnhNumero).toBe('999');
    expect(mockMotorista.cnhCategoria).toBe('D');
    expect(repository.save).toHaveBeenCalled();
  });
});
