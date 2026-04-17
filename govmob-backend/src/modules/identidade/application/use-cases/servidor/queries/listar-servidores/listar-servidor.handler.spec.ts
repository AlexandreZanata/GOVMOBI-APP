/* eslint-disable */
 
import { ListarServidorHandler } from './listar-servidor.handler';
import { ListarServidorQuery } from './listar-servidor.query';

describe('ListarServidorHandler', () => {
  let handler: ListarServidorHandler;
  let repository: any;

  beforeEach(() => {
    repository = { findAll: jest.fn() };
    handler = new ListarServidorHandler(repository);
  });

  it('should list servidores', async () => {
    const servidores = [{ id: '1', nome: 'João', cpf: { getValue: '12345678909' }, email: { getValue: 'test@test.com' } }];
    repository.findAll.mockResolvedValue(servidores);
    const result = await handler.execute(new ListarServidorQuery({}));
    expect(result.data).toMatchObject([{ id: '1', nome: 'João', cpf: '12345678909', email: 'test@test.com' }]);
  });
});
