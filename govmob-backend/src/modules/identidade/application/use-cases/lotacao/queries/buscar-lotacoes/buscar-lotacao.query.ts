import { Query } from '../../../../../../../shared-kernel/application/query.base';

export interface BuscarLotacaoPayload {
  id: string;
}

export class BuscarLotacaoQuery extends Query<BuscarLotacaoPayload> {
  constructor(payload: BuscarLotacaoPayload) {
    super(payload);
  }
}
