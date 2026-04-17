import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import {
  SolicitarCorridaHandler,
  SolicitarCorridaCommand,
} from '../../application/commands/solicitar-corrida/solicitar-corrida.handler';
import {
  AceitarCorridaHandler,
  AceitarCorridaCommand,
} from '../../application/commands/aceitar-corrida/aceitar-corrida.handler';
import {
  RecusarCorridaHandler,
  RecusarCorridaCommand,
} from '../../application/commands/recusar-corrida/recusar-corrida.handler';
import {
  IniciarDeslocamentoHandler,
  IniciarDeslocamentoCommand,
} from '../../application/commands/iniciar-deslocamento/iniciar-deslocamento.handler';
import {
  ConfirmarEmbarqueHandler,
  ConfirmarEmbarqueCommand,
} from '../../application/commands/confirmar-embarque/confirmar-embarque.handler';
import {
  ChegarAoLocalHandler,
  ChegarAoLocalCommand,
} from '../../application/commands/chegar-ao-local/chegar-ao-local.handler';
import {
  FinalizarCorridaHandler,
  FinalizarCorridaCommand,
} from '../../application/commands/finalizar-corrida/finalizar-corrida.handler';
import {
  CancelarCorridaHandler,
  CancelarCorridaCommand,
} from '../../application/commands/cancelar-corrida/cancelar-corrida.handler';
import {
  BuscarCorridaHandler,
  BuscarCorridaQuery,
} from '../../application/queries/buscar-corrida/buscar-corrida.handler';
import {
  StatusCorridaHandler,
  StatusCorridaQuery,
} from '../../application/queries/status-corrida/status-corrida.handler';
import {
  ListarMensagensHandler,
  ListarMensagensQuery,
} from '../../application/queries/listar-mensagens/listar-mensagens.handler';
import {
  ListarCorridasHandler,
  ListarCorridasQuery,
} from '../../application/queries/listar-corridas/listar-corridas.handler';
import { ObterContextoUsuarioHandler } from '../../application/queries/obter-contexto/obter-contexto.usuario.handler';
import { SolicitarCorridaDto } from './dto/solicitar-corrida.dto';
import { ListarCorridasDto } from './dto/listar-corridas.dto';
import {
  AceitarCorridaDto,
  RecusarCorridaDto,
  ConfirmarEmbarqueDto,
  FinalizarCorridaDto,
  CancelarCorridaDto,
} from './dto/corrida-acoes.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Papel } from '../../../identidade/domain/value-objects/papel.enum';
import { CurrentUser } from '../../../auth/interface/http/decorators/current-user.decorator';
import type { UserPayload } from '../../../auth/interface/http/decorators/current-user.decorator';

@ApiBearerAuth()
@Controller('corridas')
export class CorridasController {
  constructor(
    private readonly solicitarHandler: SolicitarCorridaHandler,
    private readonly aceitarHandler: AceitarCorridaHandler,
    private readonly chegarHandler: ChegarAoLocalHandler,
    private readonly recusarHandler: RecusarCorridaHandler,
    private readonly iniciarDeslocamentoHandler: IniciarDeslocamentoHandler,
    private readonly confirmarEmbarqueHandler: ConfirmarEmbarqueHandler,
    private readonly finalizarHandler: FinalizarCorridaHandler,
    private readonly cancelarHandler: CancelarCorridaHandler,
    private readonly buscarHandler: BuscarCorridaHandler,
    private readonly statusHandler: StatusCorridaHandler,
    private readonly listarMensagensHandler: ListarMensagensHandler,
    private readonly listarCorridasHandler: ListarCorridasHandler,
    private readonly contextoHandler: ObterContextoUsuarioHandler,
  ) {}

  @ApiTags('Passageiro', 'Motorista')
  @Get('contexto')
  @ApiOperation({
    summary: 'Obter contexto atual do usuário (Sincronização Mobile)',
    description:
      'Retorna dados do usuário e de qualquer corrida ativa para recuperação de estado no App.',
  })
  async obterContexto(@CurrentUser() user: UserPayload) {
    return this.contextoHandler.execute(user);
  }

  @ApiTags('Passageiro')
  @Post()
  @HttpCode(HttpStatus.ACCEPTED) // CA-02: 202
  @ApiOperation({
    summary: 'Solicitar nova corrida',
    description:
      'Inicia o processo de despacho inteligente para uma nova corrida.',
  })
  @ApiResponse({
    status: 202,
    description: 'Solicitação aceita para processamento (Outbox).',
  })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos.' })
  async solicitar(
    @CurrentUser() user: UserPayload,
    @Body() dto: SolicitarCorridaDto,
  ) {
    return this.solicitarHandler.execute(
      new SolicitarCorridaCommand(
        user.id,
        dto.origemLat,
        dto.origemLng,
        dto.destinoLat,
        dto.destinoLng,
        dto.motivoServico,
        dto.observacoes,
      ),
    );
  }

  @ApiTags('Motorista')
  @Post(':id/aceitar')
  @ApiOperation({ summary: 'Aceitar uma corrida solicitada' })
  @ApiParam({ name: 'id', description: 'ID da corrida' })
  @ApiResponse({ status: 201, description: 'Corrida aceita com sucesso.' })
  @ApiResponse({
    status: 409,
    description: 'Corrida já foi aceita por outro motorista.',
  })
  async aceitar(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: AceitarCorridaDto,
  ) {
    if (!user.motoristaId)
      throw new BadRequestException('Usuário não é um motorista');
    return this.aceitarHandler.execute(
      new AceitarCorridaCommand(id, user.motoristaId, dto.veiculoId),
    );
  }

  @ApiTags('Motorista')
  @Post(':id/recusar')
  @ApiOperation({ summary: 'Recusar uma corrida solicitada' })
  @ApiParam({ name: 'id', description: 'ID da corrida' })
  @ApiResponse({
    status: 201,
    description: 'Recusa registrada. O sistema buscará o próximo candidato.',
  })
  async recusar(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: RecusarCorridaDto,
  ) {
    if (!user.motoristaId)
      throw new BadRequestException('Usuário não é um motorista');
    return this.recusarHandler.execute(
      new RecusarCorridaCommand(id, user.motoristaId, dto.motivo),
    );
  }

  @ApiTags('Motorista')
  @Post(':id/iniciar-deslocamento')
  @ApiOperation({ summary: 'Iniciar deslocamento para o ponto de origem' })
  @ApiParam({ name: 'id', description: 'ID da corrida' })
  @HttpCode(HttpStatus.OK)
  async iniciarDeslocamento(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    if (!user.motoristaId)
      throw new BadRequestException('Usuário não é um motorista');
    return this.iniciarDeslocamentoHandler.execute(
      new IniciarDeslocamentoCommand(id, user.motoristaId),
    );
  }

  @ApiTags('Motorista')
  @Post(':id/chegar')
  @ApiOperation({ summary: 'Notificar que chegou ao local de embarque' })
  @ApiParam({ name: 'id', description: 'ID da corrida' })
  @HttpCode(HttpStatus.OK)
  async chegar(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    if (!user.motoristaId)
      throw new BadRequestException('Usuário não é um motorista');
    return this.chegarHandler.execute(
      new ChegarAoLocalCommand(id, user.motoristaId),
    );
  }

  @ApiTags('Motorista')
  @Post(':id/confirmar-embarque')
  @ApiOperation({ summary: 'Confirmar embarque do passageiro' })
  @ApiParam({ name: 'id', description: 'ID da corrida' })
  @HttpCode(HttpStatus.OK)
  async confirmarEmbarque(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: ConfirmarEmbarqueDto,
  ) {
    if (!user.motoristaId)
      throw new BadRequestException('Usuário não é um motorista');
    return this.confirmarEmbarqueHandler.execute(
      new ConfirmarEmbarqueCommand(
        id,
        user.motoristaId,
        dto?.posicaoLat,
        dto?.posicaoLng,
      ),
    );
  }

  @ApiTags('Motorista')
  @Post(':id/finalizar')
  @ApiOperation({ summary: 'Finalizar a corrida no destino' })
  @ApiParam({ name: 'id', description: 'ID da corrida' })
  @HttpCode(HttpStatus.OK)
  async finalizar(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: FinalizarCorridaDto,
  ) {
    if (!user.motoristaId)
      throw new BadRequestException('Usuário não é um motorista');
    return this.finalizarHandler.execute(
      new FinalizarCorridaCommand(
        id,
        user.motoristaId,
        dto?.posicaoFinalLat,
        dto?.posicaoFinalLng,
      ),
    );
  }

  @ApiTags('Passageiro', 'Motorista')
  @Post(':id/cancelar')
  @ApiOperation({ summary: 'Cancelar uma corrida ativa' })
  @ApiParam({ name: 'id', description: 'ID da corrida' })
  @ApiResponse({ status: 201, description: 'Corrida cancelada.' })
  @ApiResponse({
    status: 400,
    description: 'Não é possível cancelar uma corrida já finalizada.',
  })
  async cancelar(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: CancelarCorridaDto,
  ) {
    const solicitanteId = user.motoristaId || user.id;
    const tipoSolicitante: 'passageiro' | 'motorista' = user.motoristaId
      ? 'motorista'
      : 'passageiro';

    return this.cancelarHandler.execute(
      new CancelarCorridaCommand(
        id,
        solicitanteId,
        dto.motivo,
        tipoSolicitante,
      ),
    );
  }

  @ApiTags('Passageiro', 'Motorista', 'Admin')
  @Get()
  @ApiOperation({
    summary: 'Listar corridas com paginação e filtros (Role-based)',
    description:
      'Administradores vêem todas. Motoristas e passageiros vêem as suas próprias (padrão: CONCLUIDA).',
  })
  async listar(
    @CurrentUser() user: UserPayload,
    @Query() dto: ListarCorridasDto,
  ) {
    return this.listarCorridasHandler.execute(
      new ListarCorridasQuery(
        user.id,
        user.papeis,
        user.motoristaId,
        dto.page,
        dto.limit,
        dto.status,
      ),
    );
  }

  @ApiTags('Passageiro', 'Motorista')
  @Get(':id')
  @ApiOperation({ summary: 'Buscar detalhes de uma corrida' })
  @ApiParam({ name: 'id', description: 'ID da corrida' })
  async buscar(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ): Promise<Record<string, unknown>> {
    return this.buscarHandler.execute(
      new BuscarCorridaQuery(
        id,
        user.id,
        user.papeis.includes('ADMIN')
          ? 'admin'
          : user.motoristaId
            ? 'motorista'
            : 'passageiro',
      ),
    );
  }

  @ApiTags('Passageiro', 'Motorista')
  @Get(':id/status')
  @ApiOperation({
    summary: 'Obter status atualizado da corrida (Redis Optimized)',
  })
  @ApiParam({ name: 'id', description: 'ID da corrida' })
  async status(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    // Para validar a propriedade, precisamos saber quem é o dono da corrida.
    // O statusHandler deve apenas retornar o status, mas a guarda de propriedade é necessária.
    // Vamos usar o buscarHandler para validar a propriedade (ele já tem essa lógica).
    await this.buscarHandler.execute(
      new BuscarCorridaQuery(
        id,
        user.id,
        user.papeis.includes(Papel.ADMIN)
          ? 'admin'
          : user.motoristaId
            ? 'motorista'
            : 'passageiro',
      ),
    );

    return this.statusHandler.execute(new StatusCorridaQuery(id));
  }
  @ApiTags('Passageiro', 'Motorista')
  @Get(':id/mensagens')
  @ApiOperation({ summary: 'Listar histórico de mensagens da corrida' })
  @ApiParam({ name: 'id', description: 'ID da corrida' })
  async listarMensagens(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.listarMensagensHandler.execute(
      new ListarMensagensQuery(id, user.id),
    );
  }
}
