import { DesativarServidorHandler } from './desativar-servidor.handler';
import { DesativarServidorCommand } from './desativar-servidor.command';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';

describe('DesativarServidorHandler', () => {
  let handler: DesativarServidorHandler;
  let repository: any;

  beforeEach(() => {
    repository = { findById: jest.fn(), save: jest.fn() };
    handler = new DesativarServidorHandler(repository);
  });

  it('should deactivate servidor', async () => {
    const servidor = { id: '1', desativar: jest.fn() };
    repository.findById.mockResolvedValue(servidor);
    await handler.execute(new DesativarServidorCommand({ id: '1' }));
    expect(servidor.desativar).toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalled();
  });

  it('should throw NotFoundError if servidor does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(
      handler.execute(new DesativarServidorCommand({ id: '1' })),
    ).rejects.toThrow(NotFoundError);
  });
});
