import { Test, TestingModule } from '@nestjs/testing';
import { AtualizarStatusMotoristaHandler } from './atualizar-status-motorista.handler';
import { AtualizarStatusMotoristaCommand } from './atualizar-status-motorista.command';
// NotFoundError not used in this spec
import {
  Motorista,
  StatusOperacional,
} from '../../../../../domain/aggregates/motorista.aggregate';

describe('AtualizarStatusMotoristaHandler', () => {
  let handler: AtualizarStatusMotoristaHandler;
  let repository: any;

  beforeEach(async () => {
    repository = {
      findById: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AtualizarStatusMotoristaHandler,
        { provide: 'MotoristaRepositoryPort', useValue: repository },
      ],
    }).compile();

    handler = module.get<AtualizarStatusMotoristaHandler>(
      AtualizarStatusMotoristaHandler,
    );
  });

  it('deve atualizar o status do motorista com sucesso', async () => {
    const mockMotorista = Motorista.reconstitute('m-1', {
      servidorId: 's-1',
      cnhNumero: '123',
      cnhCategoria: 'AD',
      statusOperacional: StatusOperacional.OFFLINE,
      ativo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    repository.findById.mockResolvedValue(mockMotorista);

    const cmd = new AtualizarStatusMotoristaCommand(
      'm-1',
      StatusOperacional.DISPONIVEL,
    );
    await handler.execute(cmd);

    expect(mockMotorista.statusOperacional).toBe(StatusOperacional.DISPONIVEL);
    expect(repository.save).toHaveBeenCalled();
  });
});
