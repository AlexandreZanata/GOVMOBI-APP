import { Command } from '../../../../../../../shared-kernel/application/command.base';

export interface DesativarServidorPayload {
  id: string;
}

export class DesativarServidorCommand extends Command<DesativarServidorPayload> {
  constructor(payload: DesativarServidorPayload) {
    super(payload);
  }
}
