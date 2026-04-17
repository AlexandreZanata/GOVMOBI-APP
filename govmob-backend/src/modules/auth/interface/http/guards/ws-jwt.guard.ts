import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { TokenBlacklistService } from '../../../infrastructure/token/token-blacklist.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly blacklist: TokenBlacklistService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      const user = await this.validateToken(client);
      client.data.user = user;
      return true;
    } catch (err) {
      this.logger.error('Erro de autenticação WebSocket', err);
      throw new WsException('Acesso não autorizado ao WebSocket');
    }
  }

  async validateToken(client: Socket): Promise<any> {
    const authToken =
      client.handshake.headers.authorization?.split(' ')[1] ||
      client.handshake.auth?.token ||
      client.handshake.query?.token;

    if (!authToken) {
      throw new WsException('Token não fornecido');
    }

    const isBlacklisted = await this.blacklist.isRevoked(authToken as string);
    if (isBlacklisted) {
      throw new WsException('Token revogado');
    }

    const payload = await this.jwtService.verifyAsync(authToken as string, {
      secret: this.config.get<string>('config.auth.accessSecret'),
    });

    return {
      id: payload.sub,
      motoristaId: payload.motoristaId,
      cpf: payload.cpf,
      email: payload.email,
      papeis: payload.papeis,
      nome: payload.nome,
      municipioId: payload.municipioId,
    };
  }
}
