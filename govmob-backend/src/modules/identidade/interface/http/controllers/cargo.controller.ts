import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateCargoDto, UpdateCargoDto } from '../dto/cargo.dto';
import { CriarCargoHandler } from '../../../application/use-cases/cargo/commands/criar-cargos/criar-cargo.handler';
import { CriarCargoCommand } from '../../../application/use-cases/cargo/commands/criar-cargos/criar-cargo.command';
import { EditarCargoHandler } from '../../../application/use-cases/cargo/commands/editar-cargos/editar-cargo.handler';
import { EditarCargoCommand } from '../../../application/use-cases/cargo/commands/editar-cargos/editar-cargo.command';
import { DesativarCargoHandler } from '../../../application/use-cases/cargo/commands/desativar-cargos/desativar-cargo.handler';
import { DesativarCargoCommand } from '../../../application/use-cases/cargo/commands/desativar-cargos/desativar-cargo.command';
import { ReativarCargoHandler } from '../../../application/use-cases/cargo/commands/reativar-cargos/reativar-cargo.handler';
import { ReativarCargoCommand } from '../../../application/use-cases/cargo/commands/reativar-cargos/reativar-cargo.command';
import { BuscarCargoHandler } from '../../../application/use-cases/cargo/queries/buscar-cargos/buscar-cargo.handler';
import { BuscarCargoQuery } from '../../../application/use-cases/cargo/queries/buscar-cargos/buscar-cargo.query';
import { ListarCargoHandler } from '../../../application/use-cases/cargo/queries/listar-cargos/listar-cargo.handler';
import { ListarCargoQuery } from '../../../application/use-cases/cargo/queries/listar-cargos/listar-cargo.query';
import { Roles } from '../../../../auth/interface/http/decorators/roles.decorator';
import { RolesGuard } from '../../../../auth/interface/http/guards/roles.guard';
import { Papel } from '../../../domain/value-objects/papel.enum';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Identidade')
@ApiBearerAuth()
@Controller('cargos')
export class CargoController {
  constructor(
    private readonly criarCargoHandler: CriarCargoHandler,
    private readonly editarCargoHandler: EditarCargoHandler,
    private readonly desativarCargoHandler: DesativarCargoHandler,
    private readonly reativarCargoHandler: ReativarCargoHandler,
    private readonly buscarCargoHandler: BuscarCargoHandler,
    private readonly listarCargoHandler: ListarCargoHandler,
  ) {}

  @Roles(Papel.ADMIN)
  @UseGuards(RolesGuard)
  @Post()
  @ApiOperation({ summary: 'Criar novo cargo' })
  @ApiResponse({ status: 201, description: 'Cargo criado com sucesso.' })
  @ApiResponse({ status: 409, description: 'Nome de cargo já existe.' })
  async criar(@Body() dto: CreateCargoDto) {
    return this.criarCargoHandler.execute(new CriarCargoCommand(dto));
  }

  @Roles(Papel.ADMIN)
  @UseGuards(RolesGuard)
  @Put(':id')
  @ApiOperation({ summary: 'Editar cargo existente' })
  @ApiResponse({ status: 200, description: 'Cargo atualizado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Cargo não encontrado.' })
  @ApiResponse({
    status: 409,
    description: 'Novo nome já está em uso por outro cargo.',
  })
  async editar(@Param('id') id: string, @Body() dto: UpdateCargoDto) {
    return this.editarCargoHandler.execute(
      new EditarCargoCommand({ id, ...(dto as any) }),
    );
  }

  @Roles(Papel.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Desativar cargo (Soft Delete)' })
  @ApiResponse({ status: 200, description: 'Cargo desativado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Cargo não encontrado.' })
  async desativar(@Param('id') id: string) {
    return this.desativarCargoHandler.execute(
      new DesativarCargoCommand({ id }),
    );
  }

  @Roles(Papel.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id/reativar')
  @ApiOperation({ summary: 'Reativar cargo' })
  @ApiResponse({ status: 200, description: 'Cargo reativado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Cargo não encontrado.' })
  async reativar(@Param('id') id: string) {
    return this.reativarCargoHandler.execute(new ReativarCargoCommand({ id }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cargo por ID' })
  @ApiResponse({ status: 200, description: 'Dados do cargo retornados.' })
  @ApiResponse({ status: 404, description: 'Cargo não encontrado.' })
  async buscar(@Param('id') id: string) {
    return this.buscarCargoHandler.execute(new BuscarCargoQuery({ id }));
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os cargos' })
  @ApiResponse({ status: 200, description: 'Lista de cargos retornada.' })
  async listar() {
    return this.listarCargoHandler.execute(new ListarCargoQuery({}));
  }
}
