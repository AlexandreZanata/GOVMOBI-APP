/**
 * @fileoverview Mock implementation of IAvaliacoesFacade for MOCK_MODE.
 * Returns fixture data with a simulated 150–300 ms delay.
 */
import type {Avaliacao, AvaliacaoSummary} from '../../../models';
import type {IAvaliacoesFacade} from '../AvaliacoesFacade';
import type {FacadeError, Result} from '../types';

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
const delay = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));
const randomDelay = (): Promise<void> => delay(150 + Math.random() * 150);

const MOCK_AVALIACOES: Avaliacao[] = [
  {
    id: 'avl-1',
    corridaId: 'cor-101',
    passageiroId: 'pas-1',
    motoristaId: 'mot-1',
    nota: 5,
    comentario: 'Excelente motorista, muito pontual!',
    createdAt: '2026-04-10T08:30:00.000Z',
  },
  {
    id: 'avl-2',
    corridaId: 'cor-102',
    passageiroId: 'pas-2',
    motoristaId: 'mot-1',
    nota: 4,
    comentario: 'Boa viagem, carro limpo.',
    createdAt: '2026-04-12T14:15:00.000Z',
  },
  {
    id: 'avl-3',
    corridaId: 'cor-103',
    passageiroId: 'pas-3',
    motoristaId: 'mot-2',
    nota: 3,
    createdAt: '2026-04-14T09:00:00.000Z',
  },
];

const MOCK_SUMMARY: AvaliacaoSummary = {
  motoristaId: 'mot-1',
  mediaNotas: 4.5,
  totalAvaliacoes: 2,
};

export class AvaliacoesFacadeMock implements IAvaliacoesFacade {
  public async listAvaliacoes(): Promise<Result<Avaliacao[], FacadeError>> {
    await randomDelay();
    return ok(MOCK_AVALIACOES);
  }

  public async getMinhaAvaliacaoSummary(): Promise<Result<AvaliacaoSummary, FacadeError>> {
    await randomDelay();
    return ok(MOCK_SUMMARY);
  }
}
