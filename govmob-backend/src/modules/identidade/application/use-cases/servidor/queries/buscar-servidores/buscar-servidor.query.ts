import { Query } from '../../../../../../../shared-kernel/application/query.base';

export interface BuscarServidorPayload {
  id: string;
}

export class BuscarServidorQuery extends Query<BuscarServidorPayload> {
  constructor(payload: BuscarServidorPayload) {
    super(payload);
  }
}
