import { Test, TestingModule } from '@nestjs/testing';
import {
  BuscarCorridaHandler,
  BuscarCorridaQuery,
} from './buscar-corrida.handler';
import {
  NotFoundError,
  ForbiddenError,
} from '../../../../../shared-kernel/errors';
import { Corrida } from '../../../domain/aggregates/corrida/corrida.aggregate';
import { Coordenada } from '../../../../cartografia/domain/value-objects/coordenada.vo';
import { CorridaStatus } from '../../../domain/aggregates/corrida/corrida.state';

describe('BuscarCorridaHandler', () => {
  let handler: BuscarCorridaHandler;
  let corridaRepo: any;

  beforeEach(async () => {
    corridaRepo = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuscarCorridaHandler,
        { provide: 'CorridaRepositoryPort', useValue: corridaRepo },
      ],
    }).compile();

    handler = module.get<BuscarCorridaHandler>(BuscarCorridaHandler);
  });

  it('deve lançar NotFoundError se a corrida não existir', async () => {
    corridaRepo.findById.mockResolvedValue(null);
    const query = new BuscarCorridaQuery('id', 'req', 'admin');

    await expect(handler.execute(query)).rejects.toThrow(NotFoundError);
  });

  it('deve lançar ForbiddenError se o solicitante não for admin nem participante', async () => {
    const mockCorrida = Corrida.reconstitute('id-1', {
      passageiroId: 'p-1',
      motoristaId: 'm-1',
      status: CorridaStatus.ACEITA,
      origem: Coordenada.criar(0, 0),
      destino: Coordenada.criar(1, 1),
      prioridadeNivel: 1,
      motivoServico: 'Teste',
      rota: [],
    } as any);
    corridaRepo.findById.mockResolvedValue(mockCorrida);

    const query = new BuscarCorridaQuery('id-1', 'estranho', 'user');

    await expect(handler.execute(query)).rejects.toThrow(ForbiddenError);
  });

  it('deve retornar a corrida se encontrada', async () => {
    const mockCorrida = Corrida.reconstitute('id-1', {
      passageiroId: 'p-1',
      motoristaId: 'm-1',
      status: CorridaStatus.ACEITA,
      origem: Coordenada.criar(-23.5, -46.6),
      destino: Coordenada.criar(-23.6, -46.7),
      prioridadeNivel: 1,
      motivoServico: 'Teste',
      rota: [],
      timestamps: { solicitadaEm: new Date() },
    } as any);
    corridaRepo.findById.mockResolvedValue(mockCorrida);

    const query = new BuscarCorridaQuery('id-1', 'p-1', 'user');
    const result = await handler.execute(query);

    expect(result).toHaveProperty('id', 'id-1');
    expect(result.origem).toEqual({ lat: -23.5, lng: -46.6 });
  });
});
