import { CriarCargoHandler } from './criar-cargo.handler';
import { CriarCargoCommand } from './criar-cargo.command';
import { ConflictError } from '../../../../../../../shared-kernel/errors';

// Mock uuid to avoid ESM issues in Jest
jest.mock('uuid', () => ({
  v7: jest.fn(() => '018f0a1a-1a1a-7a1a-a1a1-a1a1a1a1a1a1'),
}));

describe('CriarCargoHandler', () => {
  let handler: CriarCargoHandler;
  let repository: any;

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      findByNome: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
      restore: jest.fn(),
    };
    handler = new CriarCargoHandler(repository);
  });

  it('should create a cargo successfully', async () => {
    const command = new CriarCargoCommand({
      nome: 'Desenvolvedor',
      pesoPrioridade: 50,
    });

    repository.findByNome.mockResolvedValue(null);

    await handler.execute(command);

    expect(repository.findByNome).toHaveBeenCalledWith('Desenvolvedor');
    expect(repository.save).toHaveBeenCalled();
    const savedCargo = repository.save.mock.calls[0][0];
    expect(savedCargo.nome).toBe('Desenvolvedor');
    expect(savedCargo.pesoPrioridade).toBe(50);
  });

  it('should throw ConflictError if cargo name already exists', async () => {
    const command = new CriarCargoCommand({
      nome: 'Desenvolvedor',
      pesoPrioridade: 50,
    });

    repository.findByNome.mockResolvedValue({ id: 'existing' });

    await expect(handler.execute(command)).rejects.toThrow(ConflictError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
