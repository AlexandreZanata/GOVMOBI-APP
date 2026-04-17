import { EditarLotacaoHandler } from './editar-lotacao.handler';
import { EditarLotacaoCommand } from './editar-lotacao.command';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import { ConflictError } from '../../../../../../../shared-kernel/errors/conflict.error';

describe('EditarLotacaoHandler', () => {
  let handler: EditarLotacaoHandler;
  let repository: any;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByNome: jest.fn(),
      save: jest.fn(),
    };
    handler = new EditarLotacaoHandler(repository);
  });

  it('should update lotacao successfully', async () => {
    const existing = { id: '1', nome: 'Old', atualizarNome: jest.fn() };
    repository.findById.mockResolvedValue(existing);

    await handler.execute(new EditarLotacaoCommand({ id: '1', nome: 'New' }));
    expect(existing.atualizarNome).toHaveBeenCalledWith('New');
    expect(repository.save).toHaveBeenCalled();
  });

  it('should throw ConflictError if name is taken', async () => {
    repository.findById.mockResolvedValue({ id: '1', nome: 'Old' });
    repository.findByNome.mockResolvedValue({ id: '2', nome: 'Taken' });

    await expect(
      handler.execute(new EditarLotacaoCommand({ id: '1', nome: 'Taken' })),
    ).rejects.toThrow(ConflictError);
  });

  it('should throw NotFoundError if lotacao not found', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(
      handler.execute(new EditarLotacaoCommand({ id: '1', nome: 'New' })),
    ).rejects.toThrow(NotFoundError);
  });
});
