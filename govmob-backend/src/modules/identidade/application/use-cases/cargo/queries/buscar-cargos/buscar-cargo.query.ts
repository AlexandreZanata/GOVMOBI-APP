import { Query } from '../../../../../../../shared-kernel/application/query.base';

export interface BuscarCargoPayload {
  id: string;
}

export class BuscarCargoQuery extends Query<BuscarCargoPayload> {
  constructor(payload: BuscarCargoPayload) {
    super(payload);
  }
}
