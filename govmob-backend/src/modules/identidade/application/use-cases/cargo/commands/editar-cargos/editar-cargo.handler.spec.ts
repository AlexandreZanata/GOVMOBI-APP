import { EditarCargoHandler } from './editar-cargo.handler';
import { EditarCargoCommand } from './editar-cargo.command';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import { ConflictError } from '../../../../../../../shared-kernel/errors/conflict.error';

describe('EditarCargoHandler', () => {
  let handler: EditarCargoHandler;
  let repository: any;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByNome: jest.fn(),
      save: jest.fn(),
    };
    handler = new EditarCargoHandler(repository);
  });

  it('should update cargo successfully with partial data', async () => {
    const existingCargo = {
      id: '1',
      nome: 'Dev Old',
      pesoPrioridade: 10,
      atualizarDados: jest.fn(),
    };
    repository.findById.mockResolvedValue(existingCargo);

    const command = new EditarCargoCommand({ id: '1', nome: 'Dev New' });
    await handler.execute(command);

    expect(existingCargo.atualizarDados).toHaveBeenCalledWith('Dev New', 10);
    expect(repository.save).toHaveBeenCalled();
  });

  it('should throw ConflictError if new name is already taken', async () => {
    const existingCargo = { id: '1', nome: 'Dev Old' };
    repository.findById.mockResolvedValue(existingCargo);
    repository.findByNome.mockResolvedValue({ id: '2', nome: 'Taken' });

    const command = new EditarCargoCommand({ id: '1', nome: 'Taken' });
    await expect(handler.execute(command)).rejects.toThrow(ConflictError);
  });

  it('should throw NotFoundError if cargo does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    const command = new EditarCargoCommand({ id: '99', nome: 'New' });
    await expect(handler.execute(command)).rejects.toThrow(NotFoundError);
  });
});
