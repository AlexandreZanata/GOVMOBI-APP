import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { BcryptService } from './infrastructure/crypto/bcrypt.service';
import { TokenBlacklistService } from './infrastructure/token/token-blacklist.service';
import { AccessStrategy } from './infrastructure/passport/access.strategy';
import { RefreshStrategy } from './infrastructure/passport/refresh.strategy';
import { AuthService } from './application/services/auth.service';
import { AuthController } from './interface/http/controllers/auth.controller';
import { IdentidadeModule } from '../identidade/identidade.module';
import { FrotaModule } from '../frota/frota.module';
import { WsJwtGuard } from './interface/http/guards/ws-jwt.guard';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    IdentidadeModule,
    FrotaModule,
  ],
  controllers: [AuthController],
  providers: [
    BcryptService,
    TokenBlacklistService,
    AccessStrategy,
    RefreshStrategy,
    AuthService,
    WsJwtGuard,
  ],
  exports: [
    BcryptService,
    TokenBlacklistService,
    PassportModule,
    JwtModule,
    AuthService,
    WsJwtGuard,
  ],
})
export class AuthModule {}
