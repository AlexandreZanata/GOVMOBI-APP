import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
  OnGatewayConnection,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UseGuards, Inject } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { WsJwtGuard } from '../../../auth/interface/http/guards/ws-jwt.guard';
import {
  AtualizarPosicaoHandler,
  AtualizarPosicaoCommand,
} from '../../application/commands/atualizar-posicao/atualizar-posicao.handler';
import {
  ObterContextoUsuarioHandler,
} from '../../application/queries/obter-contexto/obter-contexto.usuario.handler';
import {
  EnviarMensagemHandler,
  EnviarMensagemCommand,
} from '../../application/commands/enviar-mensagem/enviar-mensagem.handler';
import {
  ListarMensagensHandler,
  ListarMensagensQuery,
} from '../../application/queries/listar-mensagens/listar-mensagens.handler';
import { UserPayload } from '../../../auth/interface/http/decorators/current-user.decorator';

@WebSocketGateway({
  namespace: 'despacho',
  cors: { origin: '*' },
})
@UseGuards(WsJwtGuard)
export class DespachoGateway implements OnGatewayDisconnect, OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DespachoGateway.name);

  constructor(
    private readonly atualizarPosicaoHandler: AtualizarPosicaoHandler,
    private readonly enviarMensagemHandler: EnviarMensagemHandler,
    private readonly listarMensagensHandler: ListarMensagensHandler,
    private readonly contextoHandler: ObterContextoUsuarioHandler,
    private readonly wsJwtGuard: WsJwtGuard,
  ) {}

  async handleConnection(client: Socket) {
    try {
      this.logger.debug(`[WS] Tentativa de conexão: ${client.id}`);
      const user = await this.wsJwtGuard.validateToken(client);
      client.data.user = user;

      this.logger.log(
        `Conexão estabelecida: Usuário ${user.id} (${user.nome}) no socket ${client.id}`,
      );

      // Recuperar contexto ativo (corrida em andamento)
      const contexto = await this.contextoHandler.execute(user);

      if (contexto.corridaAtiva) {
        const rideRoom = `corrida:${contexto.corridaAtiva.id}`;
        await client.join(rideRoom);
        this.logger.log(
          `Usuário ${user.id} re-alocado automaticamente para a sala da corrida ${contexto.corridaAtiva.id}`,
        );

        // Sincronizar histórico básico de mensagens na reconexão
        const mensagens = await this.listarMensagensHandler.execute(
          new ListarMensagensQuery(contexto.corridaAtiva.id, user.id),
        );
        client.emit('historico-mensagens', mensagens);

        // Notificar App que a reconexão foi concluída com sucesso e o estado foi recuperado
        client.emit('reconexao-concluida', {
          status: 'success',
          corridaId: contexto.corridaAtiva.id,
          rideState: contexto.corridaAtiva.status,
        });
      } else {
        // Se for motorista, entrar na sala de disponíveis por padrão
        if (user.motoristaId) {
          await client.join('motoristas-disponiveis');
          this.logger.debug(
            `Motorista ${user.id} re-alocado para sala de disponíveis`,
          );
        } else {
          this.logger.warn(
            `Usuário ${user.id} conectado, mas NÃO possui motoristaId relacionado. Telemetria será ignorada.`,
          );
        }
      }
    } catch (error: any) {
      this.logger.error(
        `Erro ao autenticar ou restaurar contexto na conexão para ${client.id}: ${error.message}`,
      );
      client.emit('error', { message: 'Acesso não autorizado ao WebSocket' });
      client.disconnect();
    }
  }

  /**
   * Assina atualizações de uma corrida específica.
   * Entra na sala "corrida:{id}" para receber status, telemetria e chat.
   */
  @SubscribeMessage('assinar-corrida')
  async handleAssinarCorrida(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { corridaId: string },
  ): Promise<void> {
    const user = client.data.user as UserPayload;
    this.logger.debug(`[WS] Evento: assinar-corrida | User: ${user.id} | Payload: ${JSON.stringify(data)}`);
    if (!data.corridaId) return;

    // Join the specific room for this ride
    await client.join(`corrida:${data.corridaId}`);

    this.logger.debug(`User ${user.id} joined ride room: ${data.corridaId}`);

    // Enviar histórico de mensagens ao entrar (opcional, mas amigável)
    try {
      const mensagens = await this.listarMensagensHandler.execute(
        new ListarMensagensQuery(data.corridaId, user.id),
      );
      client.emit('historico-mensagens', mensagens);
    } catch (e) {
      this.logger.warn(
        `Could not load history for ${user.id} on join: ${e.message}`,
      );
    }
  }

  /**
   * Envia uma mensagem de chat para a corrida.
   */
  @SubscribeMessage('enviar-mensagem')
  async handleEnviarMensagem(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { corridaId: string; conteudo: string },
  ): Promise<void> {
    const user = client.data.user as UserPayload;
    this.logger.debug(`[WS] Evento: enviar-mensagem | User: ${user.id} | Payload: ${JSON.stringify(data)}`);

    try {
      const result = await this.enviarMensagemHandler.execute(
        new EnviarMensagemCommand(data.corridaId, user.id, data.conteudo),
      );

      const novaMensagem = {
        id: result.mensagemId,
        corridaId: data.corridaId,
        remetenteId: user.id,
        conteudo: data.conteudo,
        timestamp: new Date(),
      };

      // Emite para TODOS na sala da corrida (incluindo o remetente para confirmação)
      this.server
        .to(`corrida:${data.corridaId}`)
        .emit('nova-mensagem', novaMensagem);
    } catch (error: any) {
      client.emit('erro-mensagem', { mensagem: error.message });
    }
  }

  /**
   * Telemetria: Motorista envia sua posição.
   */
  @SubscribeMessage('atualizar-posicao')
  async handleAtualizarPosicao(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    dto: {
      corridaId?: string;
      lat: number;
      lng: number;
      velocidade: number;
      heading?: number;
    },
  ): Promise<void> {
    const user = client.data.user as UserPayload;
    const motoristaId = user?.motoristaId;

    this.logger.debug(`[WS] Evento: atualizar-posicao | User: ${user?.id} | Motorista: ${motoristaId} | Payload: ${JSON.stringify(dto)}`);

    if (!motoristaId) {
      this.logger.warn(`[WS] Evento atualizar-posicao IGNORADO: usuário ${user?.id} não possui motoristaId relacionado.`);
      return;
    }

    try {
      await this.atualizarPosicaoHandler.execute(
        new AtualizarPosicaoCommand(
          motoristaId,
          dto.corridaId || '',
          dto.lat,
          dto.lng,
          dto.velocidade,
          user.municipioId,
          dto.heading,
        ),
      );

      // Feedback para o cliente confirmar o recebimento e o status atualizado
      client.emit('posicao-confirmada', {
        timestamp: Date.now(),
        disponivel: !dto.corridaId,
      });

      if (dto.corridaId) {
        this.server.to(`corrida:${dto.corridaId}`).emit('posicao-atualizada', {
          motoristaId,
          lat: dto.lat,
          lng: dto.lng,
          velocidade: dto.velocidade,
          heading: dto.heading,
          timestamp: Date.now(),
        });
      }
    } catch (error: any) {
      this.logger.error(`Erro telemetria: ${error.message}`);
    }
  }

  /**
   * Método de conveniência para ser chamado pelo Subscriber de eventos
   */
  emitirStatusCorrida(corridaId: string, status: string, payload: any) {
    this.server.to(`corrida:${corridaId}`).emit('status-corrida-alterado', {
      corridaId,
      status,
      ...payload,
    });
  }

  /**
   * Notifica motoristas disponíveis sobre uma nova corrida (Broadcast)
   */
  notificarNovaCorrida(payload: any) {
    // Aqui poderíamos filtrar por proximidade se tivéssemos os IDs dos motoristas ativos em memória,
    // mas por simplicidade, emitimos para todos os autenticados com papel MOTORISTA.
    // Opcionalmente, motoristas assinam a sala "disponiveis" ao conectar.
    this.server
      .to('motoristas-disponiveis')
      .emit('nova-corrida-disponivel', payload);
  }

  @SubscribeMessage('ficar-disponivel')
  async handleFicarDisponivel(@ConnectedSocket() client: Socket) {
    const user = client.data.user as UserPayload;
    this.logger.debug(`[WS] Evento: ficar-disponivel | User: ${user.id}`);
    if (user.motoristaId) {
      await client.join('motoristas-disponiveis');
      this.logger.debug(
        `Motorista ${user.id} agora está disponível para receber corridas`,
      );
    }
  }

  handleDisconnect(client: Socket): void {
    const user = client.data.user as UserPayload;
    this.logger.debug(`[WS] Client ${client.id} (${user?.id || 'Incompleto'}) disconnected from Dispatch Gateway`);
  }
}
