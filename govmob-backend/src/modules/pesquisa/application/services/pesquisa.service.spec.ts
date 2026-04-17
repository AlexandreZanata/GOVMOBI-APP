import { Test, TestingModule } from '@nestjs/testing';
import { PesquisaService } from './pesquisa.service';
import { MapboxClient } from '../../infrastructure/mapbox/mapbox.client';
import { RedisService } from '../../../../shared-kernel/infrastructure/redis/redis.service';
import { ConfigService } from '@nestjs/config';

describe('PesquisaService', () => {
  let service: PesquisaService;
  let mapboxClient: jest.Mocked<MapboxClient>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PesquisaService,
        {
          provide: MapboxClient,
          useValue: {
            search: jest.fn(),
            reverse: jest.fn(),
            getDirections: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: { get: jest.fn(), set: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'config.redis.routeCacheTtlSeconds') return 3600;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PesquisaService>(PesquisaService);
    mapboxClient = module.get(MapboxClient);
    redisService = module.get(RedisService);
  });

  describe('calcularRota', () => {
    it('should return 0 route if origin and destination are identical', async () => {
      const pos = { lat: -23.5505, lng: -46.6333 };
      const result = await service.calcularRota(pos, pos);

      expect(result).toEqual({ distance: 0, duration: 0, geometry: null });
      expect(mapboxClient.getDirections).not.toHaveBeenCalled();
    });

    it('should return cached route if available', async () => {
      const origin = { lat: -23.5505, lng: -46.6333 };
      const dest = { lat: -23.553, lng: -46.636 };
      const mockResult = { distance: 100, duration: 50, geometry: {} };

      redisService.get.mockResolvedValue(JSON.stringify(mockResult));

      const result = await service.calcularRota(origin, dest);

      expect(result).toEqual(mockResult);
      expect(redisService.get).toHaveBeenCalledWith(
        expect.stringContaining('route:cache:'),
      );
      expect(mapboxClient.getDirections).not.toHaveBeenCalled();
    });

    it('should call MapboxClient and cache result on miss', async () => {
      const origin = { lat: -23.5505, lng: -46.6333 };
      const dest = { lat: -23.553, lng: -46.636 };
      const mockResult = { distance: 100, duration: 50, geometry: {} };

      redisService.get.mockResolvedValue(null);
      mapboxClient.getDirections.mockResolvedValue(mockResult);

      const result = await service.calcularRota(origin, dest);

      expect(result).toEqual(mockResult);
      expect(mapboxClient.getDirections).toHaveBeenCalledWith(origin, dest);
      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringContaining('route:cache:'),
        JSON.stringify(mockResult),
        3600,
      );
    });
  });

  describe('searchAddress (Forward)', () => {
    it('should include proximity in cache key if provided', async () => {
      const q = 'test';
      const prox = { lat: -23.5505, lng: -46.6333 };
      redisService.get.mockResolvedValue(null);
      mapboxClient.search.mockResolvedValue([]);

      await service.searchAddress(q, prox);

      const expectedQueryBase64 = Buffer.from(q).toString('base64');
      const expectedCacheKey = `geocoding:cache:${expectedQueryBase64}:prox:-23.55:-46.63`;

      expect(redisService.get).toHaveBeenCalledWith(expectedCacheKey);
      expect(mapboxClient.search).toHaveBeenCalledWith(q, prox);
    });
  });

  describe('reverseGeocode', () => {
    it('should return cached reverse result if available', async () => {
      const lat = -23.550522;
      const lng = -46.633308;
      const cached = [{ placeName: 'Cached Address', lat, lng }];

      // key rounded to 4 decimals: -23.5505, -46.6333
      const expectedCacheKey = `reverse-geocoding:cache:-23.5505:-46.6333`;
      redisService.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.reverseGeocode(lat, lng);

      expect(result).toEqual(cached);
      expect(redisService.get).toHaveBeenCalledWith(expectedCacheKey);
      expect(mapboxClient.reverse).not.toHaveBeenCalled();
    });
  });
});
