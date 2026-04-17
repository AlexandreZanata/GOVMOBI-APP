import { Test, TestingModule } from '@nestjs/testing';
import {
  CalcularDistanciaHandler,
  CalcularDistanciaQuery,
} from './calcular-distancia.handler';

describe('CalcularDistanciaHandler', () => {
  let handler: CalcularDistanciaHandler;
  let postgis: any;

  beforeEach(async () => {
    postgis = {
      stDistance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalcularDistanciaHandler,
        { provide: 'PostGISPort', useValue: postgis },
      ],
    }).compile();

    handler = module.get<CalcularDistanciaHandler>(CalcularDistanciaHandler);
  });

  it('deve retornar a distância calculada pelo PostGIS', async () => {
    postgis.stDistance.mockResolvedValue(1500);

    const query = new CalcularDistanciaQuery(-23, -46, -23.1, -46.1);
    const result = await handler.execute(query);

    expect(result).toEqual({
      distanciaMetros: 1500,
      duracaoEstimadaSeg: expect.any(Number),
    });
    expect(postgis.stDistance).toHaveBeenCalled();
  });
});
