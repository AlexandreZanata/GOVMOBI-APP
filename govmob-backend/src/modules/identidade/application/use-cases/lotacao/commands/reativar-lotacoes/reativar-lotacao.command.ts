import { Command } from '../../../../../../../shared-kernel/application/command.base';

export interface ReativarLotacaoPayload {
  id: string;
}

export class ReativarLotacaoCommand extends Command<ReativarLotacaoPayload> {
  constructor(payload: ReativarLotacaoPayload) {
    super(payload);
  }
}
