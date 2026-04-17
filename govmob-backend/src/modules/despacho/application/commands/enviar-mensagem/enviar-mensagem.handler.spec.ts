import { Test, TestingModule } from '@nestjs/testing';
import {
  EnviarMensagemHandler,
  EnviarMensagemCommand,
} from './enviar-mensagem.handler';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Corrida } from '../../../domain/aggregates/corrida/corrida.aggregate';
import { Coordenada } from '../../../../cartografia/domain/value-objects/coordenada.vo';

describe('EnviarMensagemHandler', () => {
  let handler: EnviarMensagemHandler;
  let mensagemRepo: any;
  let corridaRepo: any;

  beforeEach(async () => {
    mensagemRepo = {
      save: jest.fn(),
    };
    corridaRepo = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnviarMensagemHandler,
        { provide: 'MensagemRepositoryPort', useValue: mensagemRepo },
        { provide: 'CorridaRepositoryPort', useValue: corridaRepo },
      ],
    }).compile();

    handler = module.get<EnviarMensagemHandler>(EnviarMensagemHandler);
  });

  it('deve lançar NotFoundException se a corrida não existir', async () => {
    corridaRepo.findById.mockResolvedValue(null);
    const cmd = new EnviarMensagemCommand('corrida-1', 'user-1', 'Olá');

    await expect(handler.execute(cmd)).rejects.toThrow(NotFoundException);
  });

  it('deve lançar ForbiddenException se o remetente não pertencer à corrida', async () => {
    const mockCorrida = Corrida.reconstitute('corrida-1', {
      status: 'ACEITA',
      passageiroId: 'p-1',
      motoristaId: 'm-1',
      origem: Coordenada.criar(0, 0),
      destino: Coordenada.criar(1, 1),
      motivoServico: 'Teste',
      prioridadeNivel: 1,
      timestamps: { solicitadaEm: new Date() },
    } as any);
    corridaRepo.findById.mockResolvedValue(mockCorrida);

    const cmd = new EnviarMensagemCommand('corrida-1', 'intruso', 'Olá');

    await expect(handler.execute(cmd)).rejects.toThrow(ForbiddenException);
  });

  it('deve enviar mensagem com sucesso se o remetente for o passageiro e a corrida estiver ativa', async () => {
    const mockCorrida = Corrida.reconstitute('corrida-1', {
      status: 'ACEITA',
      passageiroId: 'p-1',
      motoristaId: 'm-1',
      origem: Coordenada.criar(0, 0),
      destino: Coordenada.criar(1, 1),
      motivoServico: 'Teste',
      prioridadeNivel: 1,
      timestamps: { solicitadaEm: new Date(), aceitaEm: new Date() },
    } as any);
    corridaRepo.findById.mockResolvedValue(mockCorrida);

    const cmd = new EnviarMensagemCommand('corrida-1', 'p-1', 'Estou aqui!');

    const result = await handler.execute(cmd);

    expect(result).toHaveProperty('mensagemId');
    expect(mensagemRepo.save).toHaveBeenCalled();
  });
});
