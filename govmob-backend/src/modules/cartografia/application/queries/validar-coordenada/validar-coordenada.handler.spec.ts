import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ValidarCoordenadaHandler,
  ValidarCoordenadaQuery,
} from './validar-coordenada.handler';
import { MunicipioBoundaryRepository } from '../../../infrastructure/postgis/municipio-boundary.repository';

describe('ValidarCoordenadaHandler', () => {
  let handler: ValidarCoordenadaHandler;
  let postgis: any;
  let municipioRepo: any;

  beforeEach(async () => {
    postgis = {
      stWithin: jest.fn(),
    };
    municipioRepo = {
      loadBoundary: jest.fn(),
    };
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'config.geo.municipioId') return 'municipio-1';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidarCoordenadaHandler,
        { provide: 'PostGISPort', useValue: postgis },
        { provide: MunicipioBoundaryRepository, useValue: municipioRepo },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    handler = module.get<ValidarCoordenadaHandler>(ValidarCoordenadaHandler);
  });

  it('deve retornar objeto com resultado se a coordenada estiver dentro do município', async () => {
    municipioRepo.loadBoundary.mockResolvedValue('POLYGON(...)');
    postgis.stWithin.mockResolvedValue(true);

    const query = new ValidarCoordenadaQuery(-23, -46);
    const result = await handler.execute(query);

    expect(result).toEqual({ dentroMunicipio: true, valida: true });
    expect(postgis.stWithin).toHaveBeenCalled();
  });
});
