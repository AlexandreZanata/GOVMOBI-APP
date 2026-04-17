import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../../../application/services/auth.service';
import { LoginDto, RegisterDto } from '../dto/auth.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { Public, Roles } from '../decorators/roles.decorator';
import { Papel } from '../../../../identidade/domain/value-objects/papel.enum';
import { RolesGuard } from '../guards/roles.guard';
import { Throttle } from '@nestjs/throttler';
import * as currentUserDecorator from '../decorators/current-user.decorator';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna informações do usuário autenticado' })
  async getMe(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.UserPayload,
  ) {
    return user;
  }

  @Public()
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Realiza login e retorna par de tokens' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.cpf, dto.senha);
  }

  @Public() // Refresh token tem sua própria guarda
  @UseGuards(AuthGuard('jwt-refresh'))
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Rotaciona o token de acesso usando um refresh token válido',
  })
  async refresh(@Req() req: any) {
    const user = req.user;
    return this.authService.refresh(user, user.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalida os tokens atuais (Logout)' })
  async logout(@Req() req: any) {
    const token = req.headers.authorization?.split(' ')[1];
    await this.authService.logout(token);
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Altera a senha do usuário autenticado' })
  async changePassword(
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.UserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      dto.senhaAntiga,
      dto.novaSenha,
    );
  }

  @Public()
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Solicita auto-registro no sistema (Requer ativação por ADMIN)',
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Roles(Papel.ADMIN)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  @Post('activate/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ativa um servidor pendente (Apenas ADMIN)' })
  async activate(@Param('id') id: string) {
    return this.authService.activate(id);
  }
}
