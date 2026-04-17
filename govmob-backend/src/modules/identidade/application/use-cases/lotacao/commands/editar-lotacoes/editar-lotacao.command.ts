import { Command } from '../../../../../../../shared-kernel/application/command.base';

export interface EditarLotacaoPayload {
  id: string;
  nome?: string;
}

export class EditarLotacaoCommand extends Command<EditarLotacaoPayload> {
  constructor(payload: EditarLotacaoPayload) {
    super(payload);
  }
}
