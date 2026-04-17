import { Test, TestingModule } from '@nestjs/testing';
import {
  ListarMensagensHandler,
  ListarMensagensQuery,
} from './listar-mensagens.handler';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ListarMensagensHandler', () => {
  let handler: ListarMensagensHandler;
  let mensagemRepo: any;
  let corridaRepo: any;

  beforeEach(async () => {
    mensagemRepo = {
      findByCorridaId: jest.fn(),
      marcarComoLidas: jest.fn(),
    };
    corridaRepo = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListarMensagensHandler,
        { provide: 'MensagemRepositoryPort', useValue: mensagemRepo },
        { provide: 'CorridaRepositoryPort', useValue: corridaRepo },
      ],
    }).compile();

    handler = module.get<ListarMensagensHandler>(ListarMensagensHandler);
  });

  it('deve lançar NotFoundException se a corrida não existir', async () => {
    corridaRepo.findById.mockResolvedValue(null);
    const query = new ListarMensagensQuery('corrida-1', 'user-1');

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
  });

  it('deve lançar ForbiddenException se o usuário não pertencer à corrida', async () => {
    corridaRepo.findById.mockResolvedValue({
      id: 'corrida-1',
      passageiroId: 'p-1',
      motoristaId: 'm-1',
    });
    const query = new ListarMensagensQuery('corrida-1', 'intruso');

    await expect(handler.execute(query)).rejects.toThrow(ForbiddenException);
  });

  it('deve retornar mensagens e marcar como lidas se o usuário for o passageiro', async () => {
    corridaRepo.findById.mockResolvedValue({
      id: 'corrida-1',
      passageiroId: 'p-1',
      motoristaId: 'm-1',
    });
    const mockMensagens = [
      {
        id: 'm1',
        remetenteId: 'm-1',
        conteudo: 'Olá',
        lida: false,
        createdAt: new Date(),
      },
    ];
    mensagemRepo.findByCorridaId.mockResolvedValue(mockMensagens);

    const query = new ListarMensagensQuery('corrida-1', 'p-1');
    const result = await handler.execute(query);

    expect(result).toHaveLength(1);
    expect(mensagemRepo.marcarComoLidas).toHaveBeenCalledWith(
      'corrida-1',
      'p-1',
    );
  });
});
