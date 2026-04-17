import { Command } from '../../../../../../../shared-kernel/application/command.base';

export interface ReativarCargoPayload {
  id: string;
}

export class ReativarCargoCommand extends Command<ReativarCargoPayload> {
  constructor(payload: ReativarCargoPayload) {
    super(payload);
  }
}
