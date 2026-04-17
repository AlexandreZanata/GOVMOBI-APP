import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistService } from '../token/token-blacklist.service';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    configService: ConfigService,
    private readonly blacklistService: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('config.auth.refreshSecret')!,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const refreshToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (refreshToken && (await this.blacklistService.isRevoked(refreshToken))) {
      throw new UnauthorizedException('Refresh token revogado');
    }

    return {
      ...payload,
      refreshToken,
    };
  }
}
