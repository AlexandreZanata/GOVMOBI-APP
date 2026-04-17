import { CriarServidorHandler } from './criar-servidor.handler';
import { CriarServidorCommand } from './criar-servidor.command';
import { ConflictError } from '../../../../../../../shared-kernel/errors/conflict.error';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import { DomainError } from '../../../../../../../shared-kernel/errors/domain.error';

// Mock uuid
jest.mock('uuid', () => ({
  v7: jest.fn(() => '018f0a1a-1a1a-7a1a-a1a1-a1a1a1a1a1a1'),
}));

describe('CriarServidorHandler', () => {
  let handler: CriarServidorHandler;
  let repository: any;
  let cargoRepository: any;
  let lotacaoRepository: any;

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      findByCpf: jest.fn().mockResolvedValue(null),
      findByEmail: jest.fn().mockResolvedValue(null),
    };
    cargoRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'cargo-1' }),
    };
    lotacaoRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'lotacao-1' }),
    };
    handler = new CriarServidorHandler(
      repository,
      cargoRepository,
      lotacaoRepository,
    );
  });

  // CPF válido gerado para testes (MOD 11)
  const validCpf = '12345678909';

  const validPayload = {
    nome: 'João Silva',
    cpf: validCpf,
    email: 'joao@example.com',
    telefone: '11999999999',
    cargoId: 'cargo-1',
    lotacaoId: 'lotacao-1',
    papeis: ['USUARIO'],
  };

  it('should create a servidor successfully', async () => {
    await handler.execute(new CriarServidorCommand(validPayload));
    expect(repository.save).toHaveBeenCalled();
  });

  it('should throw ConflictError if CPF exists', async () => {
    repository.findByCpf.mockResolvedValue({ id: 'other' });
    await expect(
      handler.execute(new CriarServidorCommand(validPayload)),
    ).rejects.toThrow(ConflictError);
  });

  it('should throw NotFoundError if cargo does not exist', async () => {
    cargoRepository.findById.mockResolvedValue(null);
    await expect(
      handler.execute(new CriarServidorCommand(validPayload)),
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw DomainError if papel is invalid', async () => {
    const invalidPayload = { ...validPayload, papeis: ['INVALIDO'] };
    await expect(
      handler.execute(new CriarServidorCommand(invalidPayload)),
    ).rejects.toThrow(DomainError);
  });
});
