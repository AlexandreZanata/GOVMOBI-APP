import { Command } from '../../../../../../../shared-kernel/application/command.base';

export interface ReativarServidorPayload {
  id: string;
}

export class ReativarServidorCommand extends Command<ReativarServidorPayload> {
  constructor(payload: ReativarServidorPayload) {
    super(payload);
  }
}
