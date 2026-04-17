import { ListarLotacaoHandler } from './listar-lotacao.handler';
import { ListarLotacaoQuery } from './listar-lotacao.query';

describe('ListarLotacaoHandler', () => {
  let handler: ListarLotacaoHandler;
  let repository: any;

  beforeEach(() => {
    repository = { findAll: jest.fn() };
    handler = new ListarLotacaoHandler(repository);
  });

  it('should list lotacoes', async () => {
    const lotacoes = [{ id: '1', nome: 'Seme' }];
    repository.findAll.mockResolvedValue(lotacoes);
    const result = await handler.execute(new ListarLotacaoQuery({}));
    expect(result.data).toMatchObject(lotacoes);
  });
});
