import { Test, TestingModule } from '@nestjs/testing';
import {
  AtualizarPosicaoHandler,
  AtualizarPosicaoCommand,
} from './atualizar-posicao.handler';
import { PosicaoRedis } from '../../../infrastructure/redis/posicao.redis';
import { ValidadorTrajetoriaService } from '../../services/validador-trajetoria.service';

describe('AtualizarPosicaoHandler', () => {
  let handler: AtualizarPosicaoHandler;
  let posicaoRedis: any;
  let corridaRepo: any;
  let validador: any;

  beforeEach(async () => {
    posicaoRedis = {
      atualizar: jest.fn(),
      publicarParaPassageiro: jest.fn(),
    };
    corridaRepo = {
      findById: jest.fn(),
      save: jest.fn(),
    };
    validador = {
      validarSalto: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AtualizarPosicaoHandler,
        { provide: 'CorridaRepositoryPort', useValue: corridaRepo },
        { provide: PosicaoRedis, useValue: posicaoRedis },
        { provide: ValidadorTrajetoriaService, useValue: validador },
      ],
    }).compile();

    handler = module.get<AtualizarPosicaoHandler>(AtualizarPosicaoHandler);
  });

  it('deve atualizar a posição do motorista no Redis', async () => {
    const cmd = new AtualizarPosicaoCommand('m-1', 'c-1', -23, -46, 50);
    await handler.execute(cmd);

    expect(posicaoRedis.atualizar).toHaveBeenCalled();
  });
});
