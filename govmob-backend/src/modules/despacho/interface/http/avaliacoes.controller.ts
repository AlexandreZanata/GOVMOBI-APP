import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../../auth/interface/http/guards/roles.guard';
import { Roles } from '../../../auth/interface/http/decorators/roles.decorator';
import { Papel } from '../../../identidade/domain/value-objects/papel.enum';
import { CurrentUser, type UserPayload } from '../../../auth/interface/http/decorators/current-user.decorator';
import { AvaliarCorridaHandler, AvaliarCorridaCommand } from '../../application/commands/avaliar-corrida/avaliar-corrida.handler';
import { ListarAvaliacoesAdminHandler, ListarAvaliacoesAdminQuery } from '../../application/queries/listar-avaliacoes-admin/listar-avaliacoes-admin.handler';
import { ObterResumoMotoristaHandler, ObterResumoMotoristaQuery } from '../../../frota/application/use-cases/motorista/queries/obter-resumo/obter-resumo.handler';
import { AvaliarCorridaDto } from './dto/avaliar-corrida.dto';

@ApiTags('Avaliações')
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AvaliacoesController {
  constructor(
    private readonly avaliarHandler: AvaliarCorridaHandler,
    private readonly listarAdminHandler: ListarAvaliacoesAdminHandler,
    private readonly resumoMotoristaHandler: ObterResumoMotoristaHandler,
  ) {}

  @Post('corridas/:id/avaliar')
  @Roles(Papel.USUARIO) // Passageiro é um usuário
  @ApiOperation({ summary: 'Avaliar um motorista após o término da corrida' })
  @ApiResponse({ status: 201, description: 'Avaliação registrada com sucesso.' })
  async avaliar(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: AvaliarCorridaDto,
  ) {
    return this.avaliarHandler.execute(
      new AvaliarCorridaCommand(id, user.id, dto.nota, dto.comentario),
    );
  }

  @Get('admin/avaliacoes')
  @Roles(Papel.ADMIN)
  @ApiOperation({ summary: 'Listar todas as avaliações do sistema (Apenas ADMIN)' })
  async listarTodas() {
    return this.listarAdminHandler.execute(new ListarAvaliacoesAdminQuery());
  }

  @Get('motoristas/minha-nota')
  @ApiOperation({ summary: 'Visualizar resumo da própria nota (Apenas MOTORISTA)' })
  async verMinhaNota(@CurrentUser() user: UserPayload) {
    if (!user.motoristaId) {
      throw new UnauthorizedException('Apenas motoristas podem acessar este recurso');
    }
    return this.resumoMotoristaHandler.execute(
      new ObterResumoMotoristaQuery(user.motoristaId),
    );
  }
}
