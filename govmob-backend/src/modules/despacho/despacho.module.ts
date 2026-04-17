import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartografiaModule } from '../cartografia/cartografia.module';
import { IdentidadeModule } from '../identidade/identidade.module';
import { NotificacaoModule } from '../notificacao/notificacao.module';
import { BullModule } from '@nestjs/bull';
import { FrotaModule } from '../frota/frota.module';

// Persistence
import { CorridaTypeOrmEntity } from './infrastructure/persistence/corrida.typeorm-entity';
import { CorridaRepository } from './infrastructure/persistence/corrida.repository';
import { MotoristaTypeOrmEntity } from '../frota/infrastructure/persistence/motorista.typeorm-entity';
import { MensagemTypeOrmEntity } from './infrastructure/persistence/mensagem.typeorm-entity';
import { MensagemRepository } from './infrastructure/persistence/mensagem.repository';
import { AvaliacaoTypeOrmEntity } from './infrastructure/persistence/avaliacao.typeorm-entity';
import { AvaliacaoRepository } from './infrastructure/persistence/avaliacao.repository';

// Redis
import { FilaDespachoRedis } from './infrastructure/redis/fila-despacho.redis';
import { PosicaoRedis } from './infrastructure/redis/posicao.redis';

// Fallback & Delegation
import { FilaDespachoPostGIS } from './infrastructure/persistence/fila-despacho.postgis';
import { FilaDespachoDelegator } from './infrastructure/persistence/fila-despacho.delegator';

// Domain
import { ScoringService } from './domain/aggregates/fila-despacho/scoring.service';
import { ValidadorTrajetoriaService } from './application/services/validador-trajetoria.service';

// Commands
import { SolicitarCorridaHandler } from './application/commands/solicitar-corrida/solicitar-corrida.handler';
import { AceitarCorridaHandler } from './application/commands/aceitar-corrida/aceitar-corrida.handler';
import { RecusarCorridaHandler } from './application/commands/recusar-corrida/recusar-corrida.handler';
import { IniciarDeslocamentoHandler } from './application/commands/iniciar-deslocamento/iniciar-deslocamento.handler';
import { ConfirmarEmbarqueHandler } from './application/commands/confirmar-embarque/confirmar-embarque.handler';
import { FinalizarCorridaHandler } from './application/commands/finalizar-corrida/finalizar-corrida.handler';
import { CancelarCorridaHandler } from './application/commands/cancelar-corrida/cancelar-corrida.handler';
import { AtualizarPosicaoHandler } from './application/commands/atualizar-posicao/atualizar-posicao.handler';
import { ChegarAoLocalHandler } from './application/commands/chegar-ao-local/chegar-ao-local.handler';
import { EnviarMensagemHandler } from './application/commands/enviar-mensagem/enviar-mensagem.handler';
import { AvaliarCorridaHandler } from './application/commands/avaliar-corrida/avaliar-corrida.handler';
import { MonitorInatividadeJob } from './application/jobs/monitor-inatividade.job';
import { DespachoProcessor } from './application/jobs/despacho.processor';

// Queries
import { BuscarCorridaHandler } from './application/queries/buscar-corrida/buscar-corrida.handler';
import { StatusCorridaHandler } from './application/queries/status-corrida/status-corrida.handler';
import { ListarMensagensHandler } from './application/queries/listar-mensagens/listar-mensagens.handler';
import { ListarCorridasHandler } from './application/queries/listar-corridas/listar-corridas.handler';
import { ObterContextoUsuarioHandler } from './application/queries/obter-contexto/obter-contexto.usuario.handler';
import { ListarAvaliacoesAdminHandler } from './application/queries/listar-avaliacoes-admin/listar-avaliacoes-admin.handler';

// Interface
import { CorridasController } from './interface/http/corridas.controller';
import { AvaliacoesController } from './interface/http/avaliacoes.controller';
import { DespachoGateway } from './interface/ws/despacho.gateway';
import { DespachoEventSubscriber } from './infrastructure/redis/despacho-event.subscriber';

// ACL — IdentidadePort adapter
import { IdentidadeService } from '../identidade/application/services/identidade.service';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AuditoriaRepository } from '../auditoria/infrastructure/persistence/auditoria.repository';
import { TransactionManager } from '../../shared-kernel/infrastructure/persistence/transaction.manager';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CorridaTypeOrmEntity,
      MotoristaTypeOrmEntity,
      MensagemTypeOrmEntity,
      AvaliacaoTypeOrmEntity,
    ]),
    BullModule.registerQueue({
      name: 'despacho',
      defaultJobOptions: {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    }),
    CartografiaModule,
    IdentidadeModule,
    AuditoriaModule,
    NotificacaoModule,
    FrotaModule,
  ],
  controllers: [CorridasController, AvaliacoesController],
  providers: [
    // Repositories & Ports
    { provide: 'CorridaRepositoryPort', useClass: CorridaRepository },
    { provide: 'MensagemRepositoryPort', useClass: MensagemRepository },
    { provide: 'AvaliacaoRepositoryPort', useClass: AvaliacaoRepository },
    { provide: 'FilaDespachoPort', useClass: FilaDespachoDelegator },
    {
      provide: 'IdentidadePort',
      useFactory: (
        identidadeService: IdentidadeService,
        auditoriaRepo: AuditoriaRepository,
      ) => ({
        buscarServidor: async (id: string) => {
          const existe = await identidadeService.existeServidor(id);
          if (!existe) return null;
          return { id, nome: '', cargo: '', nivelHierarquia: 1 };
        },
        buscarNivelPrioridade: () => Promise.resolve(1),
        validarMotoristaAtivo: () => Promise.resolve(true),
        verificarCooldownCancelamento: async (servidorId: string) => {
          const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);
          const cancelamentos = await auditoriaRepo.contarCancelamentosRecentes(
            servidorId,
            umaHoraAtras,
          );

          if (cancelamentos >= 3) {
            return { bloqueado: true, restanteMin: 5 }; // Simplificado conforme plano: 5min fixo
          }
          return { bloqueado: false, restanteMin: 0 };
        },
      }),
      inject: [IdentidadeService, AuditoriaRepository],
    },

    // Domain services
    ScoringService,
    ValidadorTrajetoriaService,

    // Implementation providers
    FilaDespachoRedis,
    FilaDespachoPostGIS,
    FilaDespachoDelegator,

    // Redis
    PosicaoRedis,

    // Commands
    SolicitarCorridaHandler,
    AceitarCorridaHandler,
    RecusarCorridaHandler,
    IniciarDeslocamentoHandler,
    ConfirmarEmbarqueHandler,
    FinalizarCorridaHandler,
    CancelarCorridaHandler,
    AtualizarPosicaoHandler,
    ChegarAoLocalHandler,
    EnviarMensagemHandler,
    AvaliarCorridaHandler,

    // Queries
    BuscarCorridaHandler,
    StatusCorridaHandler,
    ListarMensagensHandler,
    ListarCorridasHandler,
    ObterContextoUsuarioHandler,
    ListarAvaliacoesAdminHandler,

    // WebSocket
    DespachoGateway,
    DespachoEventSubscriber,

    // Jobs
    MonitorInatividadeJob,
    DespachoProcessor,

    // Persistence Helpers
    TransactionManager,
  ],
  exports: [
    'CorridaRepositoryPort',
    ScoringService,
    BuscarCorridaHandler,
    StatusCorridaHandler,
  ],
})
export class DespachoModule {}
