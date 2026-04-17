import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PesquisaService } from '../../application/services/pesquisa.service';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Pesquisa')
@ApiBearerAuth()
@Controller('pesquisa')
export class PesquisaController {
  constructor(private readonly pesquisaService: PesquisaService) {}
  @Get('config')
  @ApiOperation({
    summary: 'Obter configurações de mapa',
    description: 'Retorna o token público do Mapbox para uso no frontend.',
  })
  async getConfig() {
    return {
      mapboxToken: this.pesquisaService.getMapboxToken(),
    };
  }

  @Get('geocoding')
  @ApiOperation({
    summary: 'Pesquisar endereço',
    description:
      'Retorna coordenadas de um endereço usando Mapbox com cache em Redis. Suporta proximidade opcional.',
  })
  @ApiQuery({
    name: 'q',
    description: 'Endereço ou local para pesquisa',
    required: true,
  })
  @ApiQuery({
    name: 'lat',
    description: 'Latitude para priorizar resultados próximos',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'lng',
    description: 'Longitude para priorizar resultados próximos',
    required: false,
    type: Number,
  })
  async geocoding(
    @Query('q') q: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    if (!q || q.trim().length < 3) {
      throw new BadRequestException(
        'Query de pesquisa muito curta. Minimo 3 caracteres.',
      );
    }

    const proximity =
      lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined;

    return this.pesquisaService.searchAddress(q, proximity);
  }

  @Get('reverse-geocoding')
  @ApiOperation({
    summary: 'Geocodificação reversa',
    description:
      'Converte coordenadas (lat, lng) em um endereço legível usando Mapbox.',
  })
  @ApiQuery({
    name: 'lat',
    description: 'Latitude',
    required: true,
    type: Number,
  })
  @ApiQuery({
    name: 'lng',
    description: 'Longitude',
    required: true,
    type: Number,
  })
  async reverseGeocoding(@Query('lat') lat: string, @Query('lng') lng: string) {
    if (!lat || !lng) {
      throw new BadRequestException('Latitude e Longitude são obrigatórias.');
    }

    return this.pesquisaService.reverseGeocode(
      parseFloat(lat),
      parseFloat(lng),
    );
  }

  @Get('rota')
  @ApiOperation({
    summary: 'Calcular rota entre dois pontos',
    description:
      'Calcula o traçado (geometria), distância e duração entre dois pontos usando Mapbox com cache em Redis.',
  })
  @ApiQuery({ name: 'origemLat', type: Number, required: true })
  @ApiQuery({ name: 'origemLng', type: Number, required: true })
  @ApiQuery({ name: 'destinoLat', type: Number, required: true })
  @ApiQuery({ name: 'destinoLng', type: Number, required: true })
  async getRota(
    @Query('origemLat') oLat: string,
    @Query('origemLng') oLng: string,
    @Query('destinoLat') dLat: string,
    @Query('destinoLng') dLng: string,
  ) {
    if (!oLat || !oLng || !dLat || !dLng) {
      throw new BadRequestException('Origem e Destino são obrigatórios.');
    }

    return this.pesquisaService.calcularRota(
      { lat: parseFloat(oLat), lng: parseFloat(oLng) },
      { lat: parseFloat(dLat), lng: parseFloat(dLng) },
    );
  }
}
