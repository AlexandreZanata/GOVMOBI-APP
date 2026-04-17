import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { MensagemRepositoryPort } from '../../../domain/ports/mensagem.repository.port';
import type { CorridaRepositoryPort } from '../../../domain/ports/corrida.repository.port';

export class ListarMensagensQuery {
  constructor(
    public readonly corridaId: string,
    public readonly usuarioId: string,
  ) {}
}

@Injectable()
export class ListarMensagensHandler {
  constructor(
    @Inject('MensagemRepositoryPort')
    private readonly mensagemRepo: MensagemRepositoryPort,
    @Inject('CorridaRepositoryPort')
    private readonly corridaRepo: CorridaRepositoryPort,
  ) {}

  async execute(query: ListarMensagensQuery) {
    const corrida = await this.corridaRepo.findById(query.corridaId);
    if (!corrida) {
      throw new NotFoundException('Corrida não encontrada');
    }

    // Validação básica: usuário deve pertencer à corrida
    if (
      corrida.passageiroId !== query.usuarioId &&
      corrida.motoristaId !== query.usuarioId
    ) {
      throw new ForbiddenException(
        'Usuário não autorizado a visualizar as mensagens desta corrida',
      );
    }

    const mensagens = await this.mensagemRepo.findByCorridaId(query.corridaId);

    // Opcional: Marcar como lidas ao listar
    await this.mensagemRepo.marcarComoLidas(query.corridaId, query.usuarioId);

    return mensagens.map((m) => ({
      id: m.id,
      remetenteId: m.remetenteId,
      conteudo: m.conteudo,
      lida: m.lida,
      createdAt: m.createdAt,
    }));
  }
}
