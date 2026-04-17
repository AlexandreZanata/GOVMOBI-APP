import { DesativarCargoHandler } from './desativar-cargo.handler';
import { DesativarCargoCommand } from './desativar-cargo.command';
import { NotFoundError } from '../../../../../../../shared-kernel/errors';

describe('DesativarCargoHandler', () => {
  let handler: DesativarCargoHandler;
  let repository: any;

  beforeEach(() => {
    repository = { findById: jest.fn(), save: jest.fn() };
    handler = new DesativarCargoHandler(repository);
  });

  it('should deactivate cargo', async () => {
    const cargo = { id: '1', desativar: jest.fn() };
    repository.findById.mockResolvedValue(cargo);
    await handler.execute(new DesativarCargoCommand({ id: '1' }));
    expect(cargo.desativar).toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalledWith(cargo);
  });

  it('should throw NotFoundError if cargo does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(
      handler.execute(new DesativarCargoCommand({ id: '1' })),
    ).rejects.toThrow(NotFoundError);
  });
});
