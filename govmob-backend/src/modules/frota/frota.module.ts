import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentidadeModule } from '../identidade/identidade.module';

import { VeiculoController } from './interface/http/controllers/veiculo.controller';
import { MotoristaController } from './interface/http/controllers/motorista.controller';

import { CriarVeiculoHandler } from './application/use-cases/veiculo/commands/criar-veiculo/criar-veiculo.handler';
import { EditarVeiculoHandler } from './application/use-cases/veiculo/commands/editar-veiculo/editar-veiculo.handler';
import { DesativarVeiculoHandler } from './application/use-cases/veiculo/commands/desativar-veiculo/desativar-veiculo.handler';
import { ReativarVeiculoHandler } from './application/use-cases/veiculo/commands/reativar-veiculo/reativar-veiculo.handler';

import { BuscarVeiculoHandler } from './application/use-cases/veiculo/queries/buscar-veiculo/buscar-veiculo.handler';
import { ListarVeiculosHandler } from './application/use-cases/veiculo/queries/listar-veiculos/listar-veiculos.handler';

import { CriarMotoristaHandler } from './application/use-cases/motorista/commands/criar-motorista/criar-motorista.handler';
import { EditarMotoristaHandler } from './application/use-cases/motorista/commands/editar-motorista/editar-motorista.handler';
import { AtualizarStatusMotoristaHandler } from './application/use-cases/motorista/commands/atualizar-status-motorista/atualizar-status-motorista.handler';
import { DesativarMotoristaHandler } from './application/use-cases/motorista/commands/desativar-motorista/desativar-motorista.handler';
import { ReativarMotoristaHandler } from './application/use-cases/motorista/commands/reativar-motorista/reativar-motorista.handler';

import { BuscarMotoristaHandler } from './application/use-cases/motorista/queries/buscar-motorista/buscar-motorista.handler';
import { ListarMotoristasHandler } from './application/use-cases/motorista/queries/listar-motoristas/listar-motoristas.handler';
import { ObterResumoMotoristaHandler } from './application/use-cases/motorista/queries/obter-resumo/obter-resumo.handler';

import { VeiculoRepository } from './infrastructure/persistence/veiculo.repository';
import { MotoristaRepository } from './infrastructure/persistence/motorista.repository';

import { VeiculoTypeOrmEntity } from './infrastructure/persistence/veiculo.typeorm-entity';
import { MotoristaTypeOrmEntity } from './infrastructure/persistence/motorista.typeorm-entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([VeiculoTypeOrmEntity, MotoristaTypeOrmEntity]),
    IdentidadeModule, // Para usar o IdentidadeService
  ],
  controllers: [VeiculoController, MotoristaController],
  providers: [
    // Repositories
    { provide: 'VeiculoRepositoryPort', useClass: VeiculoRepository },
    { provide: 'MotoristaRepositoryPort', useClass: MotoristaRepository },

    // Handlers Veículo - Commands
    CriarVeiculoHandler,
    EditarVeiculoHandler,
    DesativarVeiculoHandler,
    ReativarVeiculoHandler,

    // Handlers Veículo - Queries
    BuscarVeiculoHandler,
    ListarVeiculosHandler,

    // Handlers Motorista - Commands
    CriarMotoristaHandler,
    EditarMotoristaHandler,
    AtualizarStatusMotoristaHandler,
    DesativarMotoristaHandler,
    ReativarMotoristaHandler,

    // Handlers Motorista - Queries
    BuscarMotoristaHandler,
    ListarMotoristasHandler,
    ObterResumoMotoristaHandler,
  ],
  exports: ['MotoristaRepositoryPort', ObterResumoMotoristaHandler],
})
export class FrotaModule {}
