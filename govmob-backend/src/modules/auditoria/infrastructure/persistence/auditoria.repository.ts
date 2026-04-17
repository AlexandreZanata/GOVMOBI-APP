import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventoAuditoria } from '../../domain/entities/evento-auditoria.entity';

@Injectable()
export class AuditoriaRepository {
  private readonly logger = new Logger(AuditoriaRepository.name);

  constructor(private readonly dataSource: DataSource) {}

  async persistir(evento: EventoAuditoria): Promise<void> {
    // Usa queryRunner diretamente (sem TypeORM save — evita hooks)
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.query(
        `INSERT INTO auditoria_eventos (id, event_name, aggregate_id, aggregate_type, payload, occurred_at, servidor_id, ip_address, is_critico, hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          evento.id,
          evento.eventName,
          evento.aggregateId,
          evento.aggregateType,
          JSON.stringify(evento.payload),
          evento.occurredAt,
          evento.servidorId ?? null,
          evento.ipAddress ?? null,
          evento.isCritico,
          evento.hash,
        ],
      );
    } catch (error) {
      this.logger.error(
        `Failed to persist audit event ${evento.eventName}`,
        error,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async buscarPorCorrida(corridaId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT * FROM auditoria_eventos WHERE aggregate_id = $1 ORDER BY occurred_at ASC`,
      [corridaId],
    );
  }

  async buscarCriticos(inicio: Date, fim: Date): Promise<any[]> {
    return this.dataSource.query(
      `SELECT * FROM auditoria_eventos WHERE is_critico = true AND occurred_at BETWEEN $1 AND $2 ORDER BY occurred_at DESC`,
      [inicio, fim],
    );
  }

  async contarCancelamentosRecentes(
    servidorId: string,
    desde: Date,
  ): Promise<number> {
    type CountRow = { total: string | number | bigint | null };

    const rawResult: unknown = await this.dataSource.query(
      `SELECT COUNT(*) as total 
       FROM auditoria_eventos 
       WHERE servidor_id = $1 
       AND event_name = 'CorridaCancelada' 
       AND occurred_at >= $2`,
      [servidorId, desde],
    );

    if (!Array.isArray(rawResult) || rawResult.length === 0) return 0;

    const firstRow: unknown = rawResult[0];
    if (!firstRow || typeof firstRow !== 'object' || !('total' in firstRow)) {
      return 0;
    }

    const { total } = firstRow as CountRow;

    if (typeof total === 'number') {
      return Number.isFinite(total) ? total : 0;
    }

    if (typeof total === 'bigint') {
      return Number(total);
    }

    if (typeof total === 'string') {
      const parsed = Number.parseInt(total, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    return 0;
  }
}
