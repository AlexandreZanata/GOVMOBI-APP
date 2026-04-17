import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  SolicitarCorridaHandler,
  SolicitarCorridaCommand,
} from './solicitar-corrida.handler';
import {
  ConflictError,
  GeoBoundaryError,
} from '../../../../../shared-kernel/errors';
import { DataSource } from 'typeorm';
import { PostGISService } from '../../../../cartografia/infrastructure/postgis/postgis.service';
import { MunicipioBoundaryRepository } from '../../../../cartografia/infrastructure/postgis/municipio-boundary.repository';

describe('SolicitarCorridaHandler', () => {
  let handler: SolicitarCorridaHandler;
  let corridaRepo: any;
  let identidadePort: any;
  let postgis: any;
  let municipioRepo: any;
  let dataSource: any;

  beforeEach(async () => {
    corridaRepo = {
      findAtivaByPassageiroId: jest.fn(),
      save: jest.fn(),
    };
    identidadePort = {
      buscarServidor: jest.fn(),
      verificarCooldownCancelamento: jest.fn(),
    };
    postgis = {
      stWithin: jest.fn(),
    };
    municipioRepo = {
      loadBoundary: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn((cb) => cb({ save: jest.fn() })),
    };
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'config.geo.municipioId') return 'municipio-1';
        if (key === 'config.geo.raioMaxDespachoKm') return '5';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolicitarCorridaHandler,
        { provide: 'CorridaRepositoryPort', useValue: corridaRepo },
        { provide: 'IdentidadePort', useValue: identidadePort },
        { provide: PostGISService, useValue: postgis },
        { provide: MunicipioBoundaryRepository, useValue: municipioRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    handler = module.get<SolicitarCorridaHandler>(SolicitarCorridaHandler);
  });

  it('deve lançar erro se o servidor não existir', async () => {
    identidadePort.buscarServidor.mockResolvedValue(null);
    const cmd = new SolicitarCorridaCommand('user-1', 0, 0, 1, 1, 'Motivo');

    await expect(handler.execute(cmd)).rejects.toThrow(ConflictError);
  });

  it('deve lançar erro se o servidor estiver em cooldown de cancelamento', async () => {
    identidadePort.buscarServidor.mockResolvedValue({
      id: 'user-1',
      nivelHierarquia: 1,
    });
    identidadePort.verificarCooldownCancelamento.mockResolvedValue({
      bloqueado: true,
      restanteMin: 5,
    });

    const cmd = new SolicitarCorridaCommand('user-1', 0, 0, 1, 1, 'Motivo');

    await expect(handler.execute(cmd)).rejects.toThrow(ConflictError);
  });

  it('deve lançar erro se o passageiro já tiver uma corrida ativa', async () => {
    identidadePort.buscarServidor.mockResolvedValue({
      id: 'user-1',
      nivelHierarquia: 1,
    });
    identidadePort.verificarCooldownCancelamento.mockResolvedValue({
      bloqueado: false,
    });
    corridaRepo.findAtivaByPassageiroId.mockResolvedValue({
      id: 'corrida-ativa',
    });

    const cmd = new SolicitarCorridaCommand('user-1', 0, 0, 1, 1, 'Motivo');

    await expect(handler.execute(cmd)).rejects.toThrow(ConflictError);
  });

  it('deve lançar erro se a distância for inferior a 200m', async () => {
    identidadePort.buscarServidor.mockResolvedValue({
      id: 'user-1',
      nivelHierarquia: 1,
    });
    identidadePort.verificarCooldownCancelamento.mockResolvedValue({
      bloqueado: false,
    });
    corridaRepo.findAtivaByPassageiroId.mockResolvedValue(null);

    // Mesma origem e destino
    const cmd = new SolicitarCorridaCommand(
      'user-1',
      -23.123,
      -46.123,
      -23.123,
      -46.123,
      'Motivo',
    );

    await expect(handler.execute(cmd)).rejects.toThrow(ConflictError);
  });

  it('deve lançar GeoBoundaryError se o destino for fora do município', async () => {
    identidadePort.buscarServidor.mockResolvedValue({
      id: 'user-1',
      nivelHierarquia: 1,
    });
    identidadePort.verificarCooldownCancelamento.mockResolvedValue({
      bloqueado: false,
    });
    corridaRepo.findAtivaByPassageiroId.mockResolvedValue(null);
    municipioRepo.loadBoundary.mockResolvedValue('POLYGON(...)');
    postgis.stWithin.mockResolvedValue(false);

    const cmd = new SolicitarCorridaCommand(
      'user-1',
      -23.123,
      -46.123,
      -24.123,
      -47.123,
      'Motivo',
    );

    await expect(handler.execute(cmd)).rejects.toThrow(GeoBoundaryError);
  });

  it('deve solicitar corrida com sucesso e registrar no outbox', async () => {
    identidadePort.buscarServidor.mockResolvedValue({
      id: 'user-1',
      nivelHierarquia: 1,
    });
    identidadePort.verificarCooldownCancelamento.mockResolvedValue({
      bloqueado: false,
    });
    corridaRepo.findAtivaByPassageiroId.mockResolvedValue(null);
    municipioRepo.loadBoundary.mockResolvedValue('POLYGON(...)');
    postgis.stWithin.mockResolvedValue(true);

    const cmd = new SolicitarCorridaCommand(
      'user-1',
      -23.123,
      -46.123,
      -23.5,
      -46.5,
      'Motivo',
    );

    const result = await handler.execute(cmd);

    expect(result).toHaveProperty('corridaId');
    expect(dataSource.transaction).toHaveBeenCalled();
  });
});
