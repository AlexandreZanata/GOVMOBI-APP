import { Test, TestingModule } from '@nestjs/testing';
import { CriarMotoristaHandler } from './criar-motorista.handler';
import { CriarMotoristaCommand } from './criar-motorista.command';
import {
  ConflictError,
  NotFoundError,
} from '../../../../../../../shared-kernel/errors';
import { IdentidadeService } from '../../../../../../identidade/application/services/identidade.service';

describe('CriarMotoristaHandler', () => {
  let handler: CriarMotoristaHandler;
  let repository: any;
  let identidadeService: any;

  beforeEach(async () => {
    repository = {
      findByServidorId: jest.fn(),
      save: jest.fn(),
    };
    identidadeService = {
      existeServidor: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CriarMotoristaHandler,
        { provide: 'MotoristaRepositoryPort', useValue: repository },
        { provide: IdentidadeService, useValue: identidadeService },
      ],
    }).compile();

    handler = module.get<CriarMotoristaHandler>(CriarMotoristaHandler);
  });

  it('deve lançar NotFoundError se o servidor não existir', async () => {
    identidadeService.existeServidor.mockResolvedValue(false);
    const cmd = new CriarMotoristaCommand({
      servidorId: 's1',
      cnhNumero: '123',
      cnhCategoria: 'AB',
    });

    await expect(handler.execute(cmd)).rejects.toThrow(NotFoundError);
  });

  it('deve lançar ConflictError se o servidor já for motorista', async () => {
    identidadeService.existeServidor.mockResolvedValue(true);
    repository.findByServidorId.mockResolvedValue({ id: 'm1' });
    const cmd = new CriarMotoristaCommand({
      servidorId: 's1',
      cnhNumero: '123',
      cnhCategoria: 'AB',
    });

    await expect(handler.execute(cmd)).rejects.toThrow(ConflictError);
  });

  it('deve criar motorista com sucesso', async () => {
    identidadeService.existeServidor.mockResolvedValue(true);
    repository.findByServidorId.mockResolvedValue(null);
    const cmd = new CriarMotoristaCommand({
      servidorId: 's1',
      cnhNumero: '123',
      cnhCategoria: 'AB',
    });

    const result = await handler.execute(cmd);

    expect(result.success).toBe(true);
    expect(repository.save).toHaveBeenCalled();
  });
});
