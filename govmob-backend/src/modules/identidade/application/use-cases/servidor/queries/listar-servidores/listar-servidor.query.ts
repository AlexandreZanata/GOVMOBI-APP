import { Query } from '../../../../../../../shared-kernel/application/query.base';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ListarServidorPayload {}

export class ListarServidorQuery extends Query<ListarServidorPayload> {
  constructor(payload: ListarServidorPayload) {
    super(payload);
  }
}
