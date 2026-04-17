import { Command } from '../../../../../../../shared-kernel/application/command.base';

export interface CriarServidorPayload {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  cargoId: string;
  lotacaoId: string;
  papeis: string[];
  senha?: string;
}

export class CriarServidorCommand extends Command<CriarServidorPayload> {
  constructor(payload: CriarServidorPayload) {
    super(payload);
  }
}
