import { Command } from '../../../../../../../shared-kernel/application/command.base';

export interface DesativarCargoPayload {
  id: string;
}

export class DesativarCargoCommand extends Command<DesativarCargoPayload> {
  constructor(payload: DesativarCargoPayload) {
    super(payload);
  }
}
