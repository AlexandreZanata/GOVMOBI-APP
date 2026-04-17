import { BuscarServidorHandler } from './buscar-servidor.handler';
import { BuscarServidorQuery } from './buscar-servidor.query';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';

describe('BuscarServidorHandler', () => {
  let handler: BuscarServidorHandler;
  let repository: any;

  beforeEach(() => {
    repository = { findById: jest.fn() };
    handler = new BuscarServidorHandler(repository);
  });

  it('should return servidor', async () => {
    const servidor = { id: 's1', nome: 'João' };
    repository.findById.mockResolvedValue(servidor);
    const result = await handler.execute(new BuscarServidorQuery({ id: 's1' }));
    expect(result.data).toMatchObject(servidor);
  });

  it('should throw NotFoundError if servidor not found', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(
      handler.execute(new BuscarServidorQuery({ id: 's1' })),
    ).rejects.toThrow(NotFoundError);
  });
});
