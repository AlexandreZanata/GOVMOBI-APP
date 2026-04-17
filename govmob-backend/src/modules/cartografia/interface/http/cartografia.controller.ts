import { Controller, Post, Body } from '@nestjs/common';
import {
  ValidarCoordenadaHandler,
  ValidarCoordenadaQuery,
} from '../../application/queries/validar-coordenada/validar-coordenada.handler';
import {
  CalcularDistanciaHandler,
  CalcularDistanciaQuery,
} from '../../application/queries/calcular-distancia/calcular-distancia.handler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Cartografia')
@Controller('cartografia')
export class CartografiaController {
  constructor(
    private readonly validarCoordenadaHandler: ValidarCoordenadaHandler,
    private readonly calcularDistanciaHandler: CalcularDistanciaHandler,
  ) {}

  @Post('validar-coordenada')
  @ApiOperation({
    summary: 'Validar se uma coordenada está dentro do município',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado da validação (booleano).',
  })
  async testarCoordenada(@Body() body: { lat: number; lng: number }) {
    return this.validarCoordenadaHandler.execute(
      new ValidarCoordenadaQuery(body.lat, body.lng),
    );
  }

  @Post('calcular-distancia')
  @ApiOperation({
    summary: 'Calcular distância real entre dois pontos (via PostGIS)',
  })
  @ApiResponse({
    status: 200,
    description: 'Distância em metros e tempo estimado.',
  })
  async calcularDistancia(
    @Body()
    body: {
      origemLat: number;
      origemLng: number;
      destinoLat: number;
      destinoLng: number;
    },
  ) {
    return this.calcularDistanciaHandler.execute(
      new CalcularDistanciaQuery(
        body.origemLat,
        body.origemLng,
        body.destinoLat,
        body.destinoLng,
      ),
    );
  }
}
