import { ReativarCargoHandler } from './reativar-cargo.handler';
import { ReativarCargoCommand } from './reativar-cargo.command';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';

describe('ReativarCargoHandler', () => {
  let handler: ReativarCargoHandler;
  let repository: any;

  beforeEach(() => {
    repository = { findById: jest.fn(), save: jest.fn() };
    handler = new ReativarCargoHandler(repository);
  });

  it('should reactivate cargo', async () => {
    const cargo = { id: '1', reativar: jest.fn() };
    repository.findById.mockResolvedValue(cargo);
    await handler.execute(new ReativarCargoCommand({ id: '1' }));
    expect(cargo.reativar).toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalledWith(cargo);
  });

  it('should throw NotFoundError if cargo does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(
      handler.execute(new ReativarCargoCommand({ id: '1' })),
    ).rejects.toThrow(NotFoundError);
  });
});
