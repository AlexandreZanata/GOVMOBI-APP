import { Command } from '../../../../../../../shared-kernel/application/command.base';

export interface EditarCargoPayload {
  id: string;
  nome?: string;
  pesoPrioridade?: number;
}

export class EditarCargoCommand extends Command<EditarCargoPayload> {
  constructor(payload: EditarCargoPayload) {
    super(payload);
  }
}
