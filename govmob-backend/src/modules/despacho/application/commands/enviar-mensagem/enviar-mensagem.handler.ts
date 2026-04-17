import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { Mensagem } from '../../../domain/aggregates/corrida/mensagem.aggregate';
import type { MensagemRepositoryPort } from '../../../domain/ports/mensagem.repository.port';
import type { CorridaRepositoryPort } from '../../../domain/ports/corrida.repository.port';

export class EnviarMensagemCommand {
  constructor(
    public readonly corridaId: string,
    public readonly remetenteId: string,
    public readonly conteudo: string,
  ) {}
}

@Injectable()
export class EnviarMensagemHandler {
  constructor(
    @Inject('MensagemRepositoryPort')
    private readonly mensagemRepo: MensagemRepositoryPort,
    @Inject('CorridaRepositoryPort')
    private readonly corridaRepo: CorridaRepositoryPort,
  ) {}

  async execute(
    command: EnviarMensagemCommand,
  ): Promise<{ mensagemId: string }> {
    const corrida = await this.corridaRepo.findById(command.corridaId);
    if (!corrida) {
      throw new NotFoundException('Corrida não encontrada');
    }

    // Validação básica: remetente deve ser o passageiro ou o motorista da corrida
    const isPassageiro = corrida.passageiroId === command.remetenteId;
    const isMotorista = corrida.motoristaId === command.remetenteId;

    if (!isPassageiro && !isMotorista) {
      throw new ForbiddenException(
        'Usuário não autorizado a enviar mensagens para esta corrida',
      );
    }

    if (!corrida.estaAtiva) {
      throw new ForbiddenException(
        'Não é possível enviar mensagens para uma corrida finalizada ou cancelada',
      );
    }

    const mensagemId = uuidv7();
    const mensagem = Mensagem.criar(mensagemId, {
      corridaId: command.corridaId,
      remetenteId: command.remetenteId,
      conteudo: command.conteudo,
    });

    await this.mensagemRepo.save(mensagem);

    return { mensagemId };
  }
}
