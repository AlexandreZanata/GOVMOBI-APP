import { Query } from '../../../../../../../shared-kernel/application/query.base';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ListarLotacaoPayload {}

export class ListarLotacaoQuery extends Query<ListarLotacaoPayload> {
  constructor(payload: ListarLotacaoPayload) {
    super(payload);
  }
}
