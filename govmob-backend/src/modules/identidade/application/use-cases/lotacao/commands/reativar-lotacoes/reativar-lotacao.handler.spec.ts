import { ReativarLotacaoHandler } from './reativar-lotacao.handler';
import { ReativarLotacaoCommand } from './reativar-lotacao.command';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';

describe('ReativarLotacaoHandler', () => {
  let handler: ReativarLotacaoHandler;
  let repository: any;

  beforeEach(() => {
    repository = { findById: jest.fn(), save: jest.fn() };
    handler = new ReativarLotacaoHandler(repository);
  });

  it('should reactivate lotacao', async () => {
    const lotacao = { id: '1', reativar: jest.fn() };
    repository.findById.mockResolvedValue(lotacao);
    await handler.execute(new ReativarLotacaoCommand({ id: '1' }));
    expect(lotacao.reativar).toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalled();
  });

  it('should throw NotFoundError if lotacao does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(
      handler.execute(new ReativarLotacaoCommand({ id: '1' })),
    ).rejects.toThrow(NotFoundError);
  });
});
