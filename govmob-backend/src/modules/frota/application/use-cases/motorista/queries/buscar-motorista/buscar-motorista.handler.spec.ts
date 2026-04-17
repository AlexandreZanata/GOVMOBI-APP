import { Test, TestingModule } from '@nestjs/testing';
import { BuscarMotoristaHandler } from './buscar-motorista.handler';
import { BuscarMotoristaQuery } from './buscar-motorista.query';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import { Motorista } from '../../../../../domain/aggregates/motorista.aggregate';

describe('BuscarMotoristaHandler', () => {
  let handler: BuscarMotoristaHandler;
  let repository: any;

  beforeEach(async () => {
    repository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuscarMotoristaHandler,
        { provide: 'MotoristaRepositoryPort', useValue: repository },
      ],
    }).compile();

    handler = module.get<BuscarMotoristaHandler>(BuscarMotoristaHandler);
  });

  it('deve lançar NotFoundError se o motorista não existir', async () => {
    repository.findById.mockResolvedValue(null);
    const query = new BuscarMotoristaQuery('m1');

    await expect(handler.execute(query)).rejects.toThrow(NotFoundError);
  });

  it('deve retornar motorista se encontrado', async () => {
    const mockMotorista = Motorista.create('m1', {
      servidorId: 's1',
      cnhNumero: '123',
      cnhCategoria: 'AB',
    });
    repository.findById.mockResolvedValue(mockMotorista);

    const query = new BuscarMotoristaQuery('m1');
    const result = await handler.execute(query);

    expect(result.success).toBe(true);
    expect(result.data.id).toBe('m1');
  });
});
