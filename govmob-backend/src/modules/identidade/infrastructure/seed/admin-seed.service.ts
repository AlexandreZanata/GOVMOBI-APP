import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import type { ServidorRepositoryPort } from '../../domain/ports/servidor.repository.port';
import type { CargoRepositoryPort } from '../../domain/ports/cargo.repository.port';
import type { LotacaoRepositoryPort } from '../../domain/ports/lotacao.repository.port';
import { BcryptService } from '../../../auth/infrastructure/crypto/bcrypt.service';
import { Servidor } from '../../domain/aggregates/servidor.aggregate';
import { Cpf } from '../../domain/value-objects/cpf.value-object';
import { Email } from '../../domain/value-objects/email.value-object';
import { Papel } from '../../domain/value-objects/papel.enum';
import { Cargo } from '../../domain/aggregates/cargo.aggregate';
import { Lotacao } from '../../domain/aggregates/lotacao.aggregate';

@Injectable()
export class AdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    @Inject('ServidorRepositoryPort')
    private readonly servidorRepo: ServidorRepositoryPort,
    @Inject('CargoRepositoryPort')
    private readonly cargoRepo: CargoRepositoryPort,
    @Inject('LotacaoRepositoryPort')
    private readonly lotacaoRepo: LotacaoRepositoryPort,
    private readonly bcrypt: BcryptService,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed() {
    if (process.env.SKIP_SEED === 'true') {
      this.logger.log('SKIP_SEED is true. Seeding skipped.');
      return;
    }
    try {
      this.logger.log('Verificando necessidade de seeding de ADMIN...');

      const servidores = await this.servidorRepo.findAll();
      const hasAdmin = servidores.some((s) => s.papeis.includes(Papel.ADMIN));

      if (hasAdmin) {
        this.logger.log('ADMIN já existe. Seeding abortado.');
        return;
      }

      this.logger.warn(
        'Nenhum ADMIN encontrado. Iniciando criação de ADMIN padrão...',
      );

      // 1. Garantir Cargo e Lotação básicos
      let cargoAdmin = await this.cargoRepo.findByNome('ADMINISTRADOR');
      if (!cargoAdmin) {
        cargoAdmin = Cargo.create(uuidv7(), {
          nome: 'ADMINISTRADOR',
          pesoPrioridade: 100,
        });
        await this.cargoRepo.save(cargoAdmin);
      }

      let lotacaoTI = await this.lotacaoRepo.findByNome('TI');
      if (!lotacaoTI) {
        lotacaoTI = Lotacao.create(uuidv7(), {
          nome: 'TI',
        });
        await this.lotacaoRepo.save(lotacaoTI);
      }

      const adminCpf = process.env.ADMIN_SEED_CPF || '00301748136';
      const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@govmob.gov.br';
      const adminPass = process.env.ADMIN_SEED_PASSWORD || 'GovMob@2026';

      const admin = Servidor.create(uuidv7(), {
        nome: 'Administrador do Sistema',
        cpf: Cpf.create(adminCpf),
        email: Email.create(adminEmail),
        telefone: '000000000',
        cargoId: cargoAdmin.id,
        lotacaoId: lotacaoTI.id,
        papeis: [Papel.ADMIN, Papel.USUARIO],
      });

      const hash = await this.bcrypt.hash(adminPass);
      admin.definirSenha(hash, false);
      admin.ativar();

      await this.servidorRepo.save(admin);

      this.logger.log(`ADMIN padrão criado com sucesso! CPF: ${adminCpf}`);
    } catch (error) {
      this.logger.error('Erro ao realizar seeding de ADMIN', error);
      // Non-blocking for app startup
    }
  }
}
