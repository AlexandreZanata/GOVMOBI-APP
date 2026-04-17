import { Injectable, Logger } from '@nestjs/common';
import { PontoRota } from '../../domain/aggregates/corrida/corrida.aggregate';

@Injectable()
export class ValidadorTrajetoriaService {
  private readonly logger = new Logger(ValidadorTrajetoriaService.name);

  // Velocidade máxima permitida em km/h (ex: 150km/h para emergências urbanas)
  private readonly MAX_SPEED_KMH = 150;

  /**
   * Valida se um novo ponto de rota é fisicamente possível dado o ponto anterior.
   * Evita "teleportação" causada por erro de GPS ou fraude.
   */
  validarSalto(ultimoPonto: PontoRota, novoPonto: PontoRota): boolean {
    const distanciaKm = this.calcularDistanciaHaversine(
      ultimoPonto.lat,
      ultimoPonto.lng,
      novoPonto.lat,
      novoPonto.lng,
    );

    const tempoHoras =
      (novoPonto.timestamp.getTime() - ultimoPonto.timestamp.getTime()) /
      (1000 * 60 * 60);

    if (tempoHoras <= 0) return true; // Mesma timestamp enviada em lote

    const velocidadeKmh = distanciaKm / tempoHoras;

    if (velocidadeKmh > this.MAX_SPEED_KMH) {
      this.logger.warn(
        `Possível teleporte detectado! Velocidade calculada: ${velocidadeKmh.toFixed(2)} km/h`,
      );
      return false;
    }

    return true;
  }

  private calcularDistanciaHaversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
