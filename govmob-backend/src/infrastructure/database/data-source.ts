import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { CargoTypeOrmEntity } from '../../modules/identidade/infrastructure/persistence/cargo.typeorm-entity';
import { LotacaoTypeOrmEntity } from '../../modules/identidade/infrastructure/persistence/lotacao.typeorm-entity';
import { ServidorTypeOrmEntity } from '../../modules/identidade/infrastructure/persistence/servidor.typeorm-entity';
import { VeiculoTypeOrmEntity } from '../../modules/frota/infrastructure/persistence/veiculo.typeorm-entity';
import { MotoristaTypeOrmEntity } from '../../modules/frota/infrastructure/persistence/motorista.typeorm-entity';
import { OutboxEventEntity } from '../../shared-kernel/infrastructure/outbox/outbox-event.entity';
import { CorridaTypeOrmEntity } from '../../modules/despacho/infrastructure/persistence/corrida.typeorm-entity';
import { EventoAuditoriaTypeOrmEntity } from '../../modules/auditoria/infrastructure/persistence/evento-auditoria.typeorm-entity';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [
    CargoTypeOrmEntity,
    LotacaoTypeOrmEntity,
    ServidorTypeOrmEntity,
    VeiculoTypeOrmEntity,
    MotoristaTypeOrmEntity,
    OutboxEventEntity,
    CorridaTypeOrmEntity,
    EventoAuditoriaTypeOrmEntity,
  ],
  migrations: ['src/infrastructure/database/migrations/*.ts'],
  synchronize: false,
});
