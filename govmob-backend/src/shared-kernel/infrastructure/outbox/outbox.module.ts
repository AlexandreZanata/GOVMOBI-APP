import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEventEntity } from './outbox-event.entity';
import { OutboxRepository } from './outbox.repository';
import { OutboxWorker } from './outbox.worker';
import { NotificacaoModule } from '../../../modules/notificacao/notificacao.module';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([OutboxEventEntity]), NotificacaoModule],
  providers: [OutboxRepository, OutboxWorker],
  exports: [OutboxRepository],
})
export class OutboxModule {}
