import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IdentidadeService } from '../../../identidade/application/services/identidade.service';
import { BcryptService } from '../../infrastructure/crypto/bcrypt.service';
import { TokenBlacklistService } from '../../infrastructure/token/token-blacklist.service';
import { v7 as uuidv7 } from 'uuid';
import type { MotoristaRepositoryPort } from '../../../frota/domain/ports/motorista.repository.port';
import { Servidor } from '../../../identidade/domain/aggregates/servidor.aggregate';
import { Cpf } from '../../../identidade/domain/value-objects/cpf.value-object';
import { Email } from '../../../identidade/domain/value-objects/email.value-object';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly identidadeService: IdentidadeService,
    private readonly bcrypt: BcryptService,
    private readonly blacklist: TokenBlacklistService,
    @Inject('MotoristaRepositoryPort')
    private readonly motoristaRepo: MotoristaRepositoryPort,
  ) {}

  async login(cpf: string, pass: string) {
    const servidor = await this.identidadeService.buscarPorCpf(cpf);

    if (!servidor) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (servidor.statusConta !== 'ativo') {
      throw new UnauthorizedException(
        `Conta com status: ${servidor.statusConta}`,
      );
    }

    if (!servidor.senha) {
      throw new UnauthorizedException(
        'Senha não definida. Entre em contato com o administrador.',
      );
    }

    const isMatch = await this.bcrypt.compare(pass, servidor.senha);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.generateTokenPair(servidor);
  }

  async refresh(payload: any, oldRefreshToken: string) {
    // lookup by id is authoritative; avoid an unused lookup by cpf
    const servidorById = await (
      this.identidadeService as any
    ).servidorRepository.findById(payload.sub);

    if (!servidorById || servidorById.statusConta !== 'ativo') {
      throw new UnauthorizedException('Usuário inválido ou inativo');
    }

    await this.blacklist.revoke(oldRefreshToken, 7 * 24 * 60 * 60);

    return this.generateTokenPair(servidorById);
  }

  async register(dto: any) {
    const rawCpf = String(dto.cpf).replace(/\D/g, '');
    const rawEmail = String(dto.email).trim().toLowerCase();

    const existing = await this.identidadeService.buscarPorCpf(rawCpf);
    if (existing) {
      throw new BadRequestException('Usuário já cadastrado');
    }

    const servidor = Servidor.registrar(uuidv7(), {
      nome: dto.nome,
      cpf: Cpf.create(rawCpf),
      email: Email.create(rawEmail),
      telefone: dto.telefone,
      cargoId: dto.cargoId || 'f0928929-373e-4614-9273-df3092039402',
      lotacaoId: dto.lotacaoId || 'f0928929-373e-4614-9273-df3092039402',
    });

    const hash = await this.bcrypt.hash(dto.senha);
    servidor.definirSenha(hash);

    await this.identidadeService.salvar(servidor);
    return {
      message:
        'Registro solicitado com sucesso. Aguarde ativação pelo administrador.',
    };
  }

  async activate(id: string) {
    const servidor = await (
      this.identidadeService as any
    ).servidorRepository.findById(id);
    if (!servidor) {
      throw new BadRequestException('Usuário não encontrado');
    }

    servidor.ativar();
    await this.identidadeService.salvar(servidor);
    return { message: 'Usuário ativado com sucesso' };
  }

  async logout(accessToken: string, refreshToken?: string) {
    await this.blacklist.revoke(accessToken, 15 * 60);
    if (refreshToken) {
      await this.blacklist.revoke(refreshToken, 7 * 24 * 60 * 60);
    }
  }

  async changePassword(userId: string, oldPass: string, newPass: string) {
    const servidor = await (
      this.identidadeService as any
    ).servidorRepository.findById(userId);

    if (!servidor) {
      throw new BadRequestException('Usuário não encontrado');
    }

    if (!servidor.senha) {
      // Caso raro mas possível se criado sem senha e admin não definiu
      // Permite definir a primeira senha se o usuário está logado (p.ex. via recovery no futuro)
    } else {
      const isMatch = await this.bcrypt.compare(oldPass, servidor.senha);
      if (!isMatch) {
        throw new BadRequestException('Senha atual incorreta');
      }
    }

    const hash = await this.bcrypt.hash(newPass);
    servidor.definirSenha(hash); // Isso também zera resetSenhaObrigatorio

    await this.identidadeService.salvar(servidor);

    return { message: 'Senha alterada com sucesso' };
  }

  private async generateTokenPair(servidor: any) {
    const motorista = await this.motoristaRepo.findByServidorId(servidor.id);

    const payload = {
      sub: servidor.id,
      motoristaId: motorista?.id,
      municipioId: motorista?.municipioId,
      cpf: servidor.cpf.getValue,
      email: servidor.email.getValue,
      nome: servidor.nome,
      papeis: servidor.papeis,
      resetSenhaObrigatorio: servidor.resetSenhaObrigatorio,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('config.auth.accessSecret'),
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('config.auth.refreshSecret'),
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
