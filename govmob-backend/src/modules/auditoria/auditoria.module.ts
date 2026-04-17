import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventoAuditoriaTypeOrmEntity } from './infrastructure/persistence/evento-auditoria.typeorm-entity';
import { AuditoriaRepository } from './infrastructure/persistence/auditoria.repository';

@Module({
  imports: [TypeOrmModule.forFeature([EventoAuditoriaTypeOrmEntity])],
  providers: [AuditoriaRepository],
  exports: [AuditoriaRepository],
})
export class AuditoriaModule {}
