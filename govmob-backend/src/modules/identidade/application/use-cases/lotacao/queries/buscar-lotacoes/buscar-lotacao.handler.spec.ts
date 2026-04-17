import { BuscarLotacaoHandler } from './buscar-lotacao.handler';
import { BuscarLotacaoQuery } from './buscar-lotacao.query';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';

describe('BuscarLotacaoHandler', () => {
  let handler: BuscarLotacaoHandler;
  let repository: any;

  beforeEach(() => {
    repository = { findById: jest.fn() };
    handler = new BuscarLotacaoHandler(repository);
  });

  it('should return lotacao', async () => {
    const lotacao = { id: '1', nome: 'Seme' };
    repository.findById.mockResolvedValue(lotacao);
    const result = await handler.execute(new BuscarLotacaoQuery({ id: '1' }));
    expect(result.data).toMatchObject(lotacao);
  });

  it('should throw NotFoundError if lotacao does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(
      handler.execute(new BuscarLotacaoQuery({ id: '1' })),
    ).rejects.toThrow(NotFoundError);
  });
});
