import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateServidorDto, UpdateServidorDto } from '../dto/servidor.dto';
import { CriarServidorHandler } from '../../../application/use-cases/servidor/commands/criar-servidores/criar-servidor.handler';
import { CriarServidorCommand } from '../../../application/use-cases/servidor/commands/criar-servidores/criar-servidor.command';
import { EditarServidorHandler } from '../../../application/use-cases/servidor/commands/editar-servidores/editar-servidor.handler';
import { EditarServidorCommand } from '../../../application/use-cases/servidor/commands/editar-servidores/editar-servidor.command';
import { DesativarServidorHandler } from '../../../application/use-cases/servidor/commands/desativar-servidores/desativar-servidor.handler';
import { DesativarServidorCommand } from '../../../application/use-cases/servidor/commands/desativar-servidores/desativar-servidor.command';
import { ReativarServidorHandler } from '../../../application/use-cases/servidor/commands/reativar-servidores/reativar-servidor.handler';
import { ReativarServidorCommand } from '../../../application/use-cases/servidor/commands/reativar-servidores/reativar-servidor.command';
import { BuscarServidorHandler } from '../../../application/use-cases/servidor/queries/buscar-servidores/buscar-servidor.handler';
import { BuscarServidorQuery } from '../../../application/use-cases/servidor/queries/buscar-servidores/buscar-servidor.query';
import { ListarServidorHandler } from '../../../application/use-cases/servidor/queries/listar-servidores/listar-servidor.handler';
import { ListarServidorQuery } from '../../../application/use-cases/servidor/queries/listar-servidores/listar-servidor.query';
import { Roles } from '../../../../auth/interface/http/decorators/roles.decorator';
import { Papel } from '../../../domain/value-objects/papel.enum';
import { RolesGuard } from '../../../../auth/interface/http/guards/roles.guard';
import { CurrentUser } from '../../../../auth/interface/http/decorators/current-user.decorator';
import type { UserPayload } from '../../../../auth/interface/http/decorators/current-user.decorator';

@ApiTags('Identidade')
@ApiBearerAuth()
@Controller('servidores')
export class ServidorController {
  constructor(
    private readonly criarServidorHandler: CriarServidorHandler,
    private readonly editarServidorHandler: EditarServidorHandler,
    private readonly desativarServidorHandler: DesativarServidorHandler,
    private readonly reativarServidorHandler: ReativarServidorHandler,
    private readonly buscarServidorHandler: BuscarServidorHandler,
    private readonly listarServidorHandler: ListarServidorHandler,
  ) {}

  @Roles(Papel.ADMIN)
  @UseGuards(RolesGuard)
  @Post()
  @ApiOperation({ summary: 'Criar novo servidor' })
  @ApiResponse({ status: 201, description: 'Servidor criado com sucesso.' })
  @ApiResponse({
    status: 400,
    description: 'Dados de domínio inválidos (CPF, Email ou Papéis).',
  })
  @ApiResponse({
    status: 404,
    description: 'Cargo ou Lotação não encontrados.',
  })
  @ApiResponse({ status: 409, description: 'CPF ou Email já cadastrados.' })
  async criar(@Body() dto: CreateServidorDto) {
    return this.criarServidorHandler.execute(new CriarServidorCommand(dto));
  }

  @Roles(Papel.ADMIN)
  @UseGuards(RolesGuard)
  @Put(':id')
  @ApiOperation({ summary: 'Editar servidor existente (Parcial)' })
  @ApiResponse({ status: 200, description: 'Servidor atualizado com sucesso.' })
  @ApiResponse({
    status: 404,
    description: 'Servidor, Cargo ou Lotação não encontrados.',
  })
  async editar(@Param('id') id: string, @Body() dto: UpdateServidorDto) {
    return this.editarServidorHandler.execute(
      new EditarServidorCommand({ id, ...(dto as any) }),
    );
  }

  @Roles(Papel.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Desativar servidor (Soft Delete)' })
  @ApiResponse({ status: 200, description: 'Servidor desativado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Servidor não encontrado.' })
  async desativar(@Param('id') id: string) {
    return this.desativarServidorHandler.execute(
      new DesativarServidorCommand({ id }),
    );
  }

  @Roles(Papel.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id/reativar')
  @ApiOperation({ summary: 'Reativar servidor' })
  @ApiResponse({ status: 200, description: 'Servidor reativado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Servidor não encontrado.' })
  async reativar(@Param('id') id: string) {
    return this.reativarServidorHandler.execute(
      new ReativarServidorCommand({ id }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar servidor por ID' })
  @ApiResponse({ status: 200, description: 'Dados do servidor retornados.' })
  @ApiResponse({ status: 404, description: 'Servidor não encontrado.' })
  async buscar(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    if (user.papeis.includes(Papel.ADMIN) || user.id === id) {
      return this.buscarServidorHandler.execute(
        new BuscarServidorQuery({ id }),
      );
    }
    throw new ForbiddenException('Você só pode visualizar seu próprio perfil');
  }

  @Roles(Papel.ADMIN)
  @UseGuards(RolesGuard)
  @Get()
  @ApiOperation({ summary: 'Listar todos os servidores' })
  @ApiResponse({ status: 200, description: 'Lista de servidores retornada.' })
  async listar() {
    return this.listarServidorHandler.execute(new ListarServidorQuery({}));
  }
}
