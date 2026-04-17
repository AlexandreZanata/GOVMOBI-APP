import { Command } from '../../../../../../../shared-kernel/application/command.base';

export interface CriarLotacaoPayload {
  nome: string;
}

export class CriarLotacaoCommand extends Command<CriarLotacaoPayload> {
  constructor(payload: CriarLotacaoPayload) {
    super(payload);
  }
}
