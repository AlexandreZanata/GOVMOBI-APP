import { CriarLotacaoHandler } from './criar-lotacao.handler';
import { CriarLotacaoCommand } from './criar-lotacao.command';
import { ConflictError } from '../../../../../../../shared-kernel/errors/conflict.error';

// Mock uuid
jest.mock('uuid', () => ({
  v7: jest.fn(() => '018f0a1a-1a1a-7a1a-a1a1-a1a1a1a1a1a1'),
}));

describe('CriarLotacaoHandler', () => {
  let handler: CriarLotacaoHandler;
  let repository: any;

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      findByNome: jest.fn(),
    };
    handler = new CriarLotacaoHandler(repository);
  });

  it('should create a lotacao successfully', async () => {
    const command = new CriarLotacaoCommand({ nome: 'Secretaria de Saúde' });
    repository.findByNome.mockResolvedValue(null);

    await handler.execute(command);

    expect(repository.findByNome).toHaveBeenCalledWith('Secretaria de Saúde');
    expect(repository.save).toHaveBeenCalled();
  });

  it('should throw ConflictError if lotacao name exists', async () => {
    const command = new CriarLotacaoCommand({ nome: 'Secretaria de Saúde' });
    repository.findByNome.mockResolvedValue({ id: '1' });

    await expect(handler.execute(command)).rejects.toThrow(ConflictError);
  });
});
