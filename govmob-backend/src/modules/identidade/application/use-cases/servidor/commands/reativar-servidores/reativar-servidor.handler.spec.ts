import { ReativarServidorHandler } from './reativar-servidor.handler';
import { ReativarServidorCommand } from './reativar-servidor.command';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';

describe('ReativarServidorHandler', () => {
  let handler: ReativarServidorHandler;
  let repository: any;

  beforeEach(() => {
    repository = { findById: jest.fn(), save: jest.fn() };
    handler = new ReativarServidorHandler(repository);
  });

  it('should reactivate servidor', async () => {
    const servidor = { id: '1', reativar: jest.fn() };
    repository.findById.mockResolvedValue(servidor);
    await handler.execute(new ReativarServidorCommand({ id: '1' }));
    expect(servidor.reativar).toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalled();
  });

  it('should throw NotFoundError if servidor does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(
      handler.execute(new ReativarServidorCommand({ id: '1' })),
    ).rejects.toThrow(NotFoundError);
  });
});
