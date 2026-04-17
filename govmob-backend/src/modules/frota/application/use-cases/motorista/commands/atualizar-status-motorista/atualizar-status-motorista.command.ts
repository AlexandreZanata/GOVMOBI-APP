import { StatusOperacional } from '../../../../../domain/aggregates/motorista.aggregate';

export class AtualizarStatusMotoristaCommand {
  constructor(
    public readonly id: string,
    public readonly status: StatusOperacional,
  ) {}
}
