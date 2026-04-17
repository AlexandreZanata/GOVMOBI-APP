import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Controllers
import { CargoController } from './interface/http/controllers/cargo.controller';
import { LotacaoController } from './interface/http/controllers/lotacao.controller';
import { ServidorController } from './interface/http/controllers/servidor.controller';

// Handlers - Cargo
import { CriarCargoHandler } from './application/use-cases/cargo/commands/criar-cargos/criar-cargo.handler';
import { EditarCargoHandler } from './application/use-cases/cargo/commands/editar-cargos/editar-cargo.handler';
import { DesativarCargoHandler } from './application/use-cases/cargo/commands/desativar-cargos/desativar-cargo.handler';
import { ReativarCargoHandler } from './application/use-cases/cargo/commands/reativar-cargos/reativar-cargo.handler';
import { BuscarCargoHandler } from './application/use-cases/cargo/queries/buscar-cargos/buscar-cargo.handler';
import { ListarCargoHandler } from './application/use-cases/cargo/queries/listar-cargos/listar-cargo.handler';

// Handlers - Lotacao
import { CriarLotacaoHandler } from './application/use-cases/lotacao/commands/criar-lotacoes/criar-lotacao.handler';
import { EditarLotacaoHandler } from './application/use-cases/lotacao/commands/editar-lotacoes/editar-lotacao.handler';
import { DesativarLotacaoHandler } from './application/use-cases/lotacao/commands/desativar-lotacoes/desativar-lotacao.handler';
import { ReativarLotacaoHandler } from './application/use-cases/lotacao/commands/reativar-lotacoes/reativar-lotacao.handler';
import { BuscarLotacaoHandler } from './application/use-cases/lotacao/queries/buscar-lotacoes/buscar-lotacao.handler';
import { ListarLotacaoHandler } from './application/use-cases/lotacao/queries/listar-lotacoes/listar-lotacao.handler';

// Handlers - Servidor
import { CriarServidorHandler } from './application/use-cases/servidor/commands/criar-servidores/criar-servidor.handler';
import { EditarServidorHandler } from './application/use-cases/servidor/commands/editar-servidores/editar-servidor.handler';
import { DesativarServidorHandler } from './application/use-cases/servidor/commands/desativar-servidores/desativar-servidor.handler';
import { ReativarServidorHandler } from './application/use-cases/servidor/commands/reativar-servidores/reativar-servidor.handler';
import { BuscarServidorHandler } from './application/use-cases/servidor/queries/buscar-servidores/buscar-servidor.handler';
import { ListarServidorHandler } from './application/use-cases/servidor/queries/listar-servidores/listar-servidor.handler';

// Repositories
import { CargoRepository } from './infrastructure/persistence/cargo.repository';
import { LotacaoRepository } from './infrastructure/persistence/lotacao.repository';
import { ServidorRepository } from './infrastructure/persistence/servidor.repository';

// Entities
import { CargoTypeOrmEntity } from './infrastructure/persistence/cargo.typeorm-entity';
import { LotacaoTypeOrmEntity } from './infrastructure/persistence/lotacao.typeorm-entity';
import { ServidorTypeOrmEntity } from './infrastructure/persistence/servidor.typeorm-entity';

// Services
import { IdentidadeService } from './application/services/identidade.service';
import { AdminSeedService } from './infrastructure/seed/admin-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CargoTypeOrmEntity,
      LotacaoTypeOrmEntity,
      ServidorTypeOrmEntity,
    ]),
  ],
  controllers: [CargoController, LotacaoController, ServidorController],
  providers: [
    // Services
    IdentidadeService,
    AdminSeedService,
    // Repositories
    { provide: 'CargoRepositoryPort', useClass: CargoRepository },
    { provide: 'LotacaoRepositoryPort', useClass: LotacaoRepository },
    { provide: 'ServidorRepositoryPort', useClass: ServidorRepository },

    // Handlers
    CriarCargoHandler,
    EditarCargoHandler,
    DesativarCargoHandler,
    ReativarCargoHandler,
    BuscarCargoHandler,
    ListarCargoHandler,

    CriarLotacaoHandler,
    EditarLotacaoHandler,
    DesativarLotacaoHandler,
    ReativarLotacaoHandler,
    BuscarLotacaoHandler,
    ListarLotacaoHandler,

    CriarServidorHandler,
    EditarServidorHandler,
    DesativarServidorHandler,
    ReativarServidorHandler,
    BuscarServidorHandler,
    ListarServidorHandler,
  ],
  exports: [IdentidadeService],
})
export class IdentidadeModule {}
