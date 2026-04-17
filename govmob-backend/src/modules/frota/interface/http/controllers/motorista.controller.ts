import { Controller, Get, Post, Put, Body, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CriarMotoristaHandler } from '../../../application/use-cases/motorista/commands/criar-motorista/criar-motorista.handler';
import { CriarMotoristaCommand } from '../../../application/use-cases/motorista/commands/criar-motorista/criar-motorista.command';
import { EditarMotoristaHandler } from '../../../application/use-cases/motorista/commands/editar-motorista/editar-motorista.handler';
import { EditarMotoristaCommand } from '../../../application/use-cases/motorista/commands/editar-motorista/editar-motorista.command';
import { AtualizarStatusMotoristaHandler } from '../../../application/use-cases/motorista/commands/atualizar-status-motorista/atualizar-status-motorista.handler';
import { AtualizarStatusMotoristaCommand } from '../../../application/use-cases/motorista/commands/atualizar-status-motorista/atualizar-status-motorista.command';
import { DesativarMotoristaHandler } from '../../../application/use-cases/motorista/commands/desativar-motorista/desativar-motorista.handler';
import { DesativarMotoristaCommand } from '../../../application/use-cases/motorista/commands/desativar-motorista/desativar-motorista.command';
import { ReativarMotoristaHandler } from '../../../application/use-cases/motorista/commands/reativar-motorista/reativar-motorista.handler';
import { ReativarMotoristaCommand } from '../../../application/use-cases/motorista/commands/reativar-motorista/reativar-motorista.command';
import { BuscarMotoristaHandler } from '../../../application/use-cases/motorista/queries/buscar-motorista/buscar-motorista.handler';
import { BuscarMotoristaQuery } from '../../../application/use-cases/motorista/queries/buscar-motorista/buscar-motorista.query';
import { ListarMotoristasHandler } from '../../../application/use-cases/motorista/queries/listar-motoristas/listar-motoristas.handler';
import {
  CreateMotoristaDto,
  UpdateMotoristaDto,
  UpdateStatusMotoristaDto,
} from '../dto/motorista.dto';
import { Roles } from '../../../../auth/interface/http/decorators/roles.decorator';
import { Papel } from '../../../../identidade/domain/value-objects/papel.enum';
import { RolesGuard } from '../../../../auth/interface/http/guards/roles.guard';
import { UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../../../auth/interface/http/decorators/current-user.decorator';
import type { UserPayload } from '../../../../auth/interface/http/decorators/current-user.decorator';

@ApiTags('Frota')
@ApiBearerAuth()
@Controller('frota/motoristas')
export class MotoristaController {
  constructor(
    private readonly criarHandler: CriarMotoristaHandler,
    private readonly editarHandler: EditarMotoristaHandler,
    private readonly statusHandler: AtualizarStatusMotoristaHandler,
    private readonly desativarHandler: DesativarMotoristaHandler,
    private readonly reativarHandler: ReativarMotoristaHandler,
    private readonly buscarHandler: BuscarMotoristaHandler,
    private readonly listarHandler: ListarMotoristasHandler,
  ) {}

  @Roles(Papel.ADMIN)
  @UseGuards(RolesGuard)
  @Post()
  @ApiOperation({ summary: 'Cadastrar novo motorista' })
  create(@Body() dto: CreateMotoristaDto) {
    return this.criarHandler.execute(new CriarMotoristaCommand(dto));
  }

  @Roles(Papel.ADMIN)
  @UseGuards(RolesGuard)
  @Get()
  @ApiOperation({ summary: 'Listar todos os motoristas' })
  findAll() {
    return this.listarHandler.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar motorista por ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    // Note: 'id' here is the motoristaId.
    // For a non-admin, we check if user.motoristaId matches.
    if (user.papeis.includes(Papel.ADMIN) || user.motoristaId === id) {
      return this.buscarHandler.execute(new BuscarMotoristaQuery(id));
    }
    throw new ForbiddenException('Acesso negado ao perfil deste motorista');
  }

  @Roles(Papel.ADMIN)
  @UseGuards(RolesGuard)
  @Put(':id')
  @ApiOperation({ summary: 'Atualizar CNH do motorista' })
  update(@Param('id') id: string, @Body() dto: UpdateMotoristaDto) {
    return this.editarHandler.execute(
      new EditarMotoristaCommand({ id, ...dto }),
    );
  }

  @Roles(Papel.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status operacional do motorista' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusMotoristaDto) {
    return this.statusHandler.execute(
      new AtualizarStatusMotoristaCommand(id, dto.status),
    );
  }

  @Roles(Papel.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id/desativar')
  @ApiOperation({ summary: 'Desativar motorista (soft delete)' })
  deactivate(@Param('id') id: string) {
    return this.desativarHandler.execute(new DesativarMotoristaCommand(id));
  }

  @Roles(Papel.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id/reativar')
  @ApiOperation({ summary: 'Reativar motorista' })
  reactivate(@Param('id') id: string) {
    return this.reativarHandler.execute(new ReativarMotoristaCommand(id));
  }
}
