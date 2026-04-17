import { Injectable, Logger } from '@nestjs/common';
import { FilaDespachoRedis } from '../redis/fila-despacho.redis';
import { FilaDespachoPostGIS } from '../persistence/fila-despacho.postgis';
import {
  FilaDespachoPort,
  CandidatoDespacho,
} from '../../domain/ports/fila-despacho.port';

@Injectable()
export class FilaDespachoDelegator implements FilaDespachoPort {
  private readonly logger = new Logger(FilaDespachoDelegator.name);

  constructor(
    private readonly redisImpl: FilaDespachoRedis,
    private readonly postgisImpl: FilaDespachoPostGIS,
  ) {}

  async criarFila(
    corridaId: string,
    candidatos: CandidatoDespacho[],
  ): Promise<void> {
    try {
      await this.redisImpl.criarFila(corridaId, candidatos);
    } catch (error) {
      this.logger.error(
        `Redis failure in criarFila, falling back to PostGIS stub`,
        error,
      );
      await this.postgisImpl.criarFila(corridaId, candidatos);
    }
  }

  async proximoCandidato(corridaId: string): Promise<string | null> {
    try {
      return await this.redisImpl.proximoCandidato(corridaId);
    } catch (error) {
      this.logger.error(`Redis failure in proximoCandidato`, error);
      return this.postgisImpl.proximoCandidato(corridaId);
    }
  }

  async removerFila(corridaId: string): Promise<void> {
    try {
      await this.redisImpl.removerFila(corridaId);
    } catch {
      await this.postgisImpl.removerFila(corridaId);
    }
  }

  async adicionarMotoristaDisponivel(
    id: string,
    lat: number,
    lng: number,
    score: number,
    municipioId: string,
  ): Promise<void> {
    // Sincroniza em ambos para garantir que o fallback tenha dados atualizados
    await Promise.allSettled([
      this.redisImpl.adicionarMotoristaDisponivel(
        id,
        lat,
        lng,
        score,
        municipioId,
      ),
      this.postgisImpl.adicionarMotoristaDisponivel(id, lat, lng),
    ]);
  }

  async removerMotoristaDisponivel(id: string): Promise<void> {
    await Promise.allSettled([
      this.redisImpl.removerMotoristaDisponivel(id),
      this.postgisImpl.removerMotoristaDisponivel(id),
    ]);
  }

  async buscarCandidatosNaRegiao(
    origemLat: number,
    origemLng: number,
    raioKm: number,
    municipioId?: string,
  ): Promise<string[]> {
    try {
      return await this.redisImpl.buscarCandidatosNaRegiao(
        origemLat,
        origemLng,
        raioKm,
        municipioId,
      );
    } catch (error) {
      this.logger.error(
        `Redis failure in buscarCandidatosNaRegiao, falling back to PostGIS`,
        error,
      );
      return this.postgisImpl.buscarCandidatosNaRegiao(
        origemLat,
        origemLng,
        raioKm,
        municipioId,
      );
    }
  }
}
