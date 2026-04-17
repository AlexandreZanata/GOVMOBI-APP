import { Controller, Get, Post, Put, Body, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CriarVeiculoHandler } from '../../../application/use-cases/veiculo/commands/criar-veiculo/criar-veiculo.handler';
import { CriarVeiculoCommand } from '../../../application/use-cases/veiculo/commands/criar-veiculo/criar-veiculo.command';
import { EditarVeiculoHandler } from '../../../application/use-cases/veiculo/commands/editar-veiculo/editar-veiculo.handler';
import { EditarVeiculoCommand } from '../../../application/use-cases/veiculo/commands/editar-veiculo/editar-veiculo.command';
import { DesativarVeiculoHandler } from '../../../application/use-cases/veiculo/commands/desativar-veiculo/desativar-veiculo.handler';
import { DesativarVeiculoCommand } from '../../../application/use-cases/veiculo/commands/desativar-veiculo/desativar-veiculo.command';
import { ReativarVeiculoHandler } from '../../../application/use-cases/veiculo/commands/reativar-veiculo/reativar-veiculo.handler';
import { ReativarVeiculoCommand } from '../../../application/use-cases/veiculo/commands/reativar-veiculo/reativar-veiculo.command';
import { BuscarVeiculoHandler } from '../../../application/use-cases/veiculo/queries/buscar-veiculo/buscar-veiculo.handler';
import { BuscarVeiculoQuery } from '../../../application/use-cases/veiculo/queries/buscar-veiculo/buscar-veiculo.query';
import { ListarVeiculosHandler } from '../../../application/use-cases/veiculo/queries/listar-veiculos/listar-veiculos.handler';
import { CreateVeiculoDto, UpdateVeiculoDto } from '../dto/veiculo.dto';
import { Roles } from '../../../../auth/interface/http/decorators/roles.decorator';
import { RolesGuard } from '../../../../auth/interface/http/guards/roles.guard';
import { Papel } from '../../../../identidade/domain/value-objects/papel.enum';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Frota')
@ApiBearerAuth()
@Roles(Papel.ADMIN)
@UseGuards(RolesGuard)
@Controller('frota/veiculos')
export class VeiculoController {
  constructor(
    private readonly criarHandler: CriarVeiculoHandler,
    private readonly editarHandler: EditarVeiculoHandler,
    private readonly desativarHandler: DesativarVeiculoHandler,
    private readonly reativarHandler: ReativarVeiculoHandler,
    private readonly buscarHandler: BuscarVeiculoHandler,
    private readonly listarHandler: ListarVeiculosHandler,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar novo veículo' })
  create(@Body() dto: CreateVeiculoDto) {
    return this.criarHandler.execute(new CriarVeiculoCommand(dto));
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os veículos' })
  findAll() {
    return this.listarHandler.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar veículo por ID' })
  findOne(@Param('id') id: string) {
    return this.buscarHandler.execute(new BuscarVeiculoQuery(id));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar dados do veículo' })
  update(@Param('id') id: string, @Body() dto: UpdateVeiculoDto) {
    return this.editarHandler.execute(new EditarVeiculoCommand({ id, ...dto }));
  }

  @Patch(':id/desativar')
  @ApiOperation({ summary: 'Desativar veículo (soft delete)' })
  deactivate(@Param('id') id: string) {
    return this.desativarHandler.execute(new DesativarVeiculoCommand(id));
  }

  @Patch(':id/reativar')
  @ApiOperation({ summary: 'Reativar veículo' })
  reactivate(@Param('id') id: string) {
    return this.reativarHandler.execute(new ReativarVeiculoCommand(id));
  }
}
