import { Command } from '../../../../../../../shared-kernel/application/command.base';

export interface DesativarLotacaoPayload {
  id: string;
}

export class DesativarLotacaoCommand extends Command<DesativarLotacaoPayload> {
  constructor(payload: DesativarLotacaoPayload) {
    super(payload);
  }
}
