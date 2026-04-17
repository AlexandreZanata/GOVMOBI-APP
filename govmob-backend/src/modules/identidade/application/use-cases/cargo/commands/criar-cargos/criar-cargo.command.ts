import { Command } from '../../../../../../../shared-kernel/application/command.base';

export interface CriarCargoPayload {
  nome: string;
  pesoPrioridade: number;
}

export class CriarCargoCommand extends Command<CriarCargoPayload> {
  constructor(payload: CriarCargoPayload) {
    super(payload);
  }
}
