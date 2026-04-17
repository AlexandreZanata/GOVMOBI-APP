/* eslint-disable */
 
import { EditarServidorHandler } from './editar-servidor.handler';
import { EditarServidorCommand } from './editar-servidor.command';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import { DomainError } from '../../../../../../../shared-kernel/errors/domain.error';

describe('EditarServidorHandler', () => {
  let handler: EditarServidorHandler;
  let repository: any;
  let cargoRepository: any;
  let lotacaoRepository: any;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      save: jest.fn(),
    };
    cargoRepository = { findById: jest.fn().mockResolvedValue({ id: 'c1' }) };
    lotacaoRepository = { findById: jest.fn().mockResolvedValue({ id: 'l1' }) };
    handler = new EditarServidorHandler(
      repository,
      cargoRepository,
      lotacaoRepository,
    );
  });

  const existingServidor = {
    id: 's1',
    nome: 'Old Name',
    telefone: 'old',
    cargoId: 'c1',
    lotacaoId: 'l1',
    papeis: ['USUARIO'],
    atualizarDados: jest.fn((n, t, c, l, p) => {
      if (p.includes('INVALIDO')) throw new DomainError('Papel inválido: INVALIDO');
    }),
  };

  it('should update servidor partially', async () => {
    repository.findById.mockResolvedValue(existingServidor);
    await handler.execute(
      new EditarServidorCommand({ id: 's1', nome: 'New Name' }),
    );

    expect(existingServidor.atualizarDados).toHaveBeenCalledWith(
      'New Name',
      'old',
      'c1',
      'l1',
      ['USUARIO'],
    );
    expect(repository.save).toHaveBeenCalled();
  });

  it('should validate new cargoId if provided', async () => {
    repository.findById.mockResolvedValue(existingServidor);
    cargoRepository.findById.mockResolvedValue(null);

    await expect(
      handler.execute(
        new EditarServidorCommand({ id: 's1', cargoId: 'invalid' }),
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw DomainError for invalid papel', async () => {
    repository.findById.mockResolvedValue(existingServidor);
    await expect(
      handler.execute(
        new EditarServidorCommand({ id: 's1', papeis: ['INVALIDO'] }),
      ),
    ).rejects.toThrow(DomainError);
  });
});
