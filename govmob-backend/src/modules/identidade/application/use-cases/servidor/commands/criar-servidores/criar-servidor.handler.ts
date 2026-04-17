import { Injectable, Inject } from '@nestjs/common';
import type { UseCase } from '../../../../../../../shared-kernel/application/use-case.interface';
import { CriarServidorCommand } from './criar-servidor.command';
import type { ServidorRepositoryPort } from '../../../../../domain/ports/servidor.repository.port';
import type { CargoRepositoryPort } from '../../../../../domain/ports/cargo.repository.port';
import type { LotacaoRepositoryPort } from '../../../../../domain/ports/lotacao.repository.port';
import { Servidor } from '../../../../../domain/aggregates/servidor.aggregate';
import { Papel } from '../../../../../domain/value-objects/papel.enum';
import { Cpf } from '../../../../../domain/value-objects/cpf.value-object';
import { Email } from '../../../../../domain/value-objects/email.value-object';
import { v7 as uuidv7 } from 'uuid';
import { ConflictError } from '../../../../../../../shared-kernel/errors/conflict.error';
import { NotFoundError } from '../../../../../../../shared-kernel/errors/not-found.error';
import { ServidorPresentationMapper } from '../../../../../interface/http/mappers/servidor-presentation.mapper';
import {
  ApiResponse,
  ApiResponseHelper,
} from '../../../../../../../shared-kernel/application/api-response.dto';
import { BcryptService } from '../../../../../../auth/infrastructure/crypto/bcrypt.service';

@Injectable()
export class CriarServidorHandler implements UseCase<
  CriarServidorCommand,
  ApiResponse<any>
> {
  constructor(
    @Inject('ServidorRepositoryPort')
    private readonly repository: ServidorRepositoryPort,
    @Inject('CargoRepositoryPort')
    private readonly cargoRepository: CargoRepositoryPort,
    @Inject('LotacaoRepositoryPort')
    private readonly lotacaoRepository: LotacaoRepositoryPort,
    private readonly bcrypt: BcryptService,
  ) {}

  async execute(command: CriarServidorCommand): Promise<ApiResponse<any>> {
    const { payload } = command;

    const [cargo, lotacao, existingCpf, existingEmail] = await Promise.all([
      this.cargoRepository.findById(payload.cargoId),
      this.lotacaoRepository.findById(payload.lotacaoId),
      this.repository.findByCpf(payload.cpf),
      this.repository.findByEmail(payload.email),
    ]);

    if (!cargo) throw new NotFoundError('Cargo não encontrado');
    if (!lotacao) throw new NotFoundError('Lotação não encontrada');
    if (existingCpf) throw new ConflictError('CPF já cadastrado');
    if (existingEmail) throw new ConflictError('E-mail já cadastrado');

    // Senha padrão é o CPF (apenas números) se não fornecida
    const sanitizedCpf = payload.cpf.replace(/\D/g, '');
    const senhaFinal = payload.senha || sanitizedCpf;
    const hash = await this.bcrypt.hash(senhaFinal);

    // Se criou com a senha padrão (CPF), exige troca no primeiro acesso
    const resetObrigatorio = !payload.senha;

    const entity = Servidor.create(uuidv7(), {
      nome: payload.nome,
      cpf: Cpf.create(payload.cpf),
      email: Email.create(payload.email),
      telefone: payload.telefone,
      cargoId: payload.cargoId,
      lotacaoId: payload.lotacaoId,
      papeis: (payload.papeis ?? []) as Papel[],
      resetSenhaObrigatorio: resetObrigatorio,
    });

    entity.definirSenha(hash, resetObrigatorio);

    await this.repository.save(entity);
    return ApiResponseHelper.success(
      ServidorPresentationMapper.toResponse(entity),
    );
  }
}
