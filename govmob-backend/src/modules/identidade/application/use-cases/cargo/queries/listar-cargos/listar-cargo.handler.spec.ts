import { ListarCargoHandler } from './listar-cargo.handler';
import { ListarCargoQuery } from './listar-cargo.query';

describe('ListarCargoHandler', () => {
  let handler: ListarCargoHandler;
  let repository: any;

  beforeEach(() => {
    repository = { findAll: jest.fn() };
    handler = new ListarCargoHandler(repository);
  });

  it('should list cargos', async () => {
    const cargos = [{ id: '1', nome: 'Dev' }];
    repository.findAll.mockResolvedValue(cargos);
    const result = await handler.execute(new ListarCargoQuery({}));
    expect(result.data).toMatchObject(cargos);
  });
});
