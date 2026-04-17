import { BuscarCargoHandler } from './buscar-cargo.handler';
import { BuscarCargoQuery } from './buscar-cargo.query';
import { NotFoundError } from '../../../../../../../shared-kernel/errors';

describe('BuscarCargoHandler', () => {
  let handler: BuscarCargoHandler;
  let repository: any;

  beforeEach(() => {
    repository = { findById: jest.fn() };
    handler = new BuscarCargoHandler(repository);
  });

  it('should return cargo', async () => {
    const cargo = { id: '1', nome: 'Dev' };
    repository.findById.mockResolvedValue(cargo);
    const result = await handler.execute(new BuscarCargoQuery({ id: '1' }));
    expect(result.data).toMatchObject(cargo);
  });

  it('should throw NotFoundError if cargo does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(
      handler.execute(new BuscarCargoQuery({ id: '1' })),
    ).rejects.toThrow(NotFoundError);
  });
});
