import { DesativarLotacaoHandler } from './desativar-lotacao.handler';
import { DesativarLotacaoCommand } from './desativar-lotacao.command';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';

describe('DesativarLotacaoHandler', () => {
  let handler: DesativarLotacaoHandler;
  let repository: any;

  beforeEach(() => {
    repository = { findById: jest.fn(), save: jest.fn() };
    handler = new DesativarLotacaoHandler(repository);
  });

  it('should deactivate lotacao', async () => {
    const lotacao = { id: '1', desativar: jest.fn() };
    repository.findById.mockResolvedValue(lotacao);
    await handler.execute(new DesativarLotacaoCommand({ id: '1' }));
    expect(lotacao.desativar).toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalled();
  });

  it('should throw NotFoundError if lotacao does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(
      handler.execute(new DesativarLotacaoCommand({ id: '1' })),
    ).rejects.toThrow(NotFoundError);
  });
});
