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
import { CreateLotacaoDto, UpdateLotacaoDto } from '../dto/lotacao.dto';
import { CriarLotacaoHandler } from '../../../application/use-cases/lotacao/commands/criar-lotacoes/criar-lotacao.handler';
import { CriarLotacaoCommand } from '../../../application/use-cases/lotacao/commands/criar-lotacoes/criar-lotacao.command';
import { EditarLotacaoHandler } from '../../../application/use-cases/lotacao/commands/editar-lotacoes/editar-lotacao.handler';
import { EditarLotacaoCommand } from '../../../application/use-cases/lotacao/commands/editar-lotacoes/editar-lotacao.command';
import { DesativarLotacaoHandler } from '../../../application/use-cases/lotacao/commands/desativar-lotacoes/desativar-lotacao.handler';
import { DesativarLotacaoCommand } from '../../../application/use-cases/lotacao/commands/desativar-lotacoes/desativar-lotacao.command';
import { ReativarLotacaoHandler } from '../../../application/use-cases/lotacao/commands/reativar-lotacoes/reativar-lotacao.handler';
import { ReativarLotacaoCommand } from '../../../application/use-cases/lotacao/commands/reativar-lotacoes/reativar-lotacao.command';
import { BuscarLotacaoHandler } from '../../../application/use-cases/lotacao/queries/buscar-lotacoes/buscar-lotacao.handler';
import { BuscarLotacaoQuery } from '../../../application/use-cases/lotacao/queries/buscar-lotacoes/buscar-lotacao.query';
import { ListarLotacaoHandler } from '../../../application/use-cases/lotacao/queries/listar-lotacoes/listar-lotacao.handler';
import { ListarLotacaoQuery } from '../../../application/use-cases/lotacao/queries/listar-lotacoes/listar-lotacao.query';
import { Roles } from '../../../../auth/interface/http/decorators/roles.decorator';
import { RolesGuard } from '../../../../auth/interface/http/guards/roles.guard';
import { Papel } from '../../../domain/value-objects/papel.enum';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Identidade')
@ApiBearerAuth()
@Controller('lotacoes')
export class LotacaoController {
  constructor(
    private readonly criarLotacaoHandler: CriarLotacaoHandler,
    private readonly editarLotacaoHandler: EditarLotacaoHandler,
    private readonly desativarLotacaoHandler: DesativarLotacaoHandler,
    private readonly reativarLotacaoHandler: ReativarLotacaoHandler,
    private readonly buscarLotacaoHandler: BuscarLotacaoHandler,
    private readonly listarLotacaoHandler: ListarLotacaoHandler,
  ) {}

  @Roles(Papel.ADMIN)
  @UseGuards(RolesGuard)
  @Post()
  @ApiOperation({ summary: 'Criar nova lotação' })
  @ApiResponse({ status: 201, description: 'Lotação criada com sucesso.' })
  @ApiResponse({ status: 409, description: 'Nome de lotação já existe.' })
  async criar(@Body() dto: CreateLotacaoDto) {
    return this.criarLotacaoHandler.execute(new CriarLotacaoCommand(dto));
  }

  @Roles(Papel.ADMIN)
  @UseGuards(RolesGuard)
  @Put(':id')
  @ApiOperation({ summary: 'Editar lotação existente' })
  @ApiResponse({ status: 200, description: 'Lotação atualizada com sucesso.' })
  @ApiResponse({ status: 404, description: 'Lotação não encontrada.' })
  @ApiResponse({ status: 409, description: 'Novo nome já está em uso.' })
  async editar(@Param('id') id: string, @Body() dto: UpdateLotacaoDto) {
    return this.editarLotacaoHandler.execute(
      new EditarLotacaoCommand({ id, ...(dto as any) }),
    );
  }

  @Roles(Papel.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Desativar lotação (Soft Delete)' })
  @ApiResponse({ status: 200, description: 'Lotação desativada com sucesso.' })
  @ApiResponse({ status: 404, description: 'Lotação não encontrada.' })
  async desativar(@Param('id') id: string) {
    return this.desativarLotacaoHandler.execute(
      new DesativarLotacaoCommand({ id }),
    );
  }

  @Roles(Papel.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id/reativar')
  @ApiOperation({ summary: 'Reativar lotação' })
  @ApiResponse({ status: 200, description: 'Lotação reativada com sucesso.' })
  @ApiResponse({ status: 404, description: 'Lotação não encontrada.' })
  async reativar(@Param('id') id: string) {
    return this.reativarLotacaoHandler.execute(
      new ReativarLotacaoCommand({ id }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar lotação por ID' })
  @ApiResponse({ status: 200, description: 'Dados da lotação retornados.' })
  @ApiResponse({ status: 404, description: 'Lotação não encontrada.' })
  async buscar(@Param('id') id: string) {
    return this.buscarLotacaoHandler.execute(new BuscarLotacaoQuery({ id }));
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as lotações' })
  @ApiResponse({ status: 200, description: 'Lista de lotações retornada.' })
  async listar() {
    return this.listarLotacaoHandler.execute(new ListarLotacaoQuery({}));
  }
}
