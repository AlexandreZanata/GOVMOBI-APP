import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistService } from '../token/token-blacklist.service';
import { IdentidadeService } from '../../../identidade/application/services/identidade.service';

@Injectable()
export class AccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly blacklistService: TokenBlacklistService,
    private readonly identidadeService: IdentidadeService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('config.auth.accessSecret')!,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (token && (await this.blacklistService.isRevoked(token))) {
      throw new UnauthorizedException('Token revogado');
    }

    // Validação de status em tempo real (Secure by default)
    const servidor = await (
      this.identidadeService as any
    ).servidorRepository.findById(payload.sub);

    if (!servidor || servidor.statusConta !== 'ativo') {
      throw new UnauthorizedException('Usuário inativo ou não encontrado');
    }

    // Payload: { sub: servidorId, motoristaId?: string, papeis: Papel[], email: string, nome: string }
    return {
      id: payload.sub,
      motoristaId: payload.motoristaId,
      municipioId: payload.municipioId,
      email: payload.email,
      papeis: payload.papeis,
      nome: payload.nome,
    };
  }
}
