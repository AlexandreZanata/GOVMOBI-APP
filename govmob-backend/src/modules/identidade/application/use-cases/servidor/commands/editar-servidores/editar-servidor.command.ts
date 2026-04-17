import { Command } from '../../../../../../../shared-kernel/application/command.base';

export interface EditarServidorPayload {
  id: string;
  nome?: string;
  telefone?: string;
  cargoId?: string;
  lotacaoId?: string;
  papeis?: string[];
}

export class EditarServidorCommand extends Command<EditarServidorPayload> {
  constructor(payload: EditarServidorPayload) {
    super(payload);
  }
}
