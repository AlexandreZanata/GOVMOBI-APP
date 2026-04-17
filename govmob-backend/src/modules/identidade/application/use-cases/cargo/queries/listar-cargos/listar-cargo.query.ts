import { Query } from '../../../../../../../shared-kernel/application/query.base';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ListarCargoPayload {}

export class ListarCargoQuery extends Query<ListarCargoPayload> {
  constructor(payload: ListarCargoPayload) {
    super(payload);
  }
}
