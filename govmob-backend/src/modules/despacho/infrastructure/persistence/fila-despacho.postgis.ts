import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MotoristaTypeOrmEntity } from '../../../frota/infrastructure/persistence/motorista.typeorm-entity';
import {
  FilaDespachoPort,
  CandidatoDespacho,
} from '../../domain/ports/fila-despacho.port';

@Injectable()
export class FilaDespachoPostGIS implements FilaDespachoPort {
  private readonly logger = new Logger(FilaDespachoPostGIS.name);

  constructor(
    @InjectRepository(MotoristaTypeOrmEntity)
    private readonly motoristaRepo: Repository<MotoristaTypeOrmEntity>,
  ) {}

  criarFila(
    corridaId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _candidatos: CandidatoDespacho[],
  ): Promise<void> {
    this.logger.warn(
      `Operando em modo de fallback (PostGIS) para corrida ${corridaId}`,
    );
    return Promise.resolve();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  proximoCandidato(_corridaId: string): Promise<string | null> {
    return Promise.resolve(null);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  removerFila(_corridaId: string): Promise<void> {
    return Promise.resolve();
  }

  async adicionarMotoristaDisponivel(
    id: string,
    lat: number,
    lng: number,
  ): Promise<void> {
    await this.motoristaRepo.update(id, {
      ultimaPosicao: `POINT(${lng} ${lat})` as unknown as string,
      statusOperacional: 'disponivel',
    });
  }

  async removerMotoristaDisponivel(id: string): Promise<void> {
    await this.motoristaRepo.update(id, {
      statusOperacional: 'ocupado',
    });
  }

  async buscarCandidatosNaRegiao(
    origemLat: number,
    origemLng: number,
    raioKm: number,
    municipioId?: string,
  ): Promise<string[]> {
    let query = `
      SELECT id FROM motoristas 
      WHERE statusOperacional = 'disponivel' 
      AND ST_DWithin(
        ultimaPosicao, 
        ST_SetSRID(ST_Point($1, $2), 4326), 
        $3
      )
    `;

    const params: any[] = [origemLng, origemLat, raioKm * 1000];

    if (municipioId) {
      query += ` AND "municipioId" = $4`;
      params.push(municipioId);
    }

    const rawResult: unknown = await this.motoristaRepo.query(query, params);

    if (!Array.isArray(rawResult)) {
      return [];
    }

    return rawResult.flatMap((row: unknown) => {
      if (!row || typeof row !== 'object' || !('id' in row)) {
        return [];
      }

      const { id } = row as { id?: unknown };
      return typeof id === 'string' ? [id] : [];
    });
  }
}
