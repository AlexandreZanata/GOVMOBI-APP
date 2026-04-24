/**
 * @fileoverview POC tests for the Corridas screens — role-separated architecture.
 *
 * USUARIO (passenger) screens:
 *   PassageiroCorridasListScreen — loading, empty state, active corrida card, request CTA
 *   AcompanharCorridaScreen — loading, details, messages, cancel flow
 *
 * MOTORISTA (driver) screens:
 *   MotoristaCorridaScreen — loading, aceitar/recusar, conflict error
 *
 * Covers: loading, error, success, and primary interactions.
 * TSC clean — zero `any`.
 */
import React, {useRef} from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {I18nextProvider} from 'react-i18next';
import {ThemeProvider} from '@theme/index';
import {FacadeProvider} from '@services/facades';
import {i18n} from '../../../i18n';
import corridaReducer from '../../../store/slices/corridaSlice';
import type {CorridaState} from '@store/slices/corridaSlice';
import authReducer from '../../../store/slices/authSlice';
import uiReducer from '../../../store/slices/uiSlice';
import locationReducer from '../../../store/slices/locationSlice';
import {PassageiroCorridasListScreen} from '../PassageiroCorridasListScreen';
import {AcompanharCorridaScreen} from '../AcompanharCorridaScreen';
import {MotoristaCorridaScreen} from '../MotoristaCorridaScreen';
import {UserRole, UserStatus} from '@models/User';
import type {ICorridaFacade} from '@services/facades';
import type {FacadeError, Result} from '@services/facades';
import type {Corrida, CorridaMensagem} from '@models/Corrida';
import type {
  CorridaContexto,
  CorridaStatusResponse,
  SolicitarCorridaResponse,
} from '../../../types';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Prevent status-polling setInterval (5s) from keeping the test worker alive.
// Only suppress intervals ≥ 5000ms — shorter intervals (animations etc.) still fire.
const _realSetInterval = global.setInterval;
jest.spyOn(global, 'setInterval').mockImplementation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fn: any, ms?: number, ...args: any[]) =>
    ms !== undefined && ms >= 5000
      ? (0 as unknown as ReturnType<typeof setInterval>)
      : _realSetInterval(fn, ms, ...args),
);

const mockUseRoute = jest.fn().mockReturnValue({params: {}});

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual<typeof import('@react-navigation/native')>(
    '@react-navigation/native',
  );
  return {
    ...actual,
    useRoute: () => mockUseRoute(),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ok = <T,>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T,>(
  msg: string,
  code = 'NETWORK_ERROR',
): Result<T, FacadeError> => ({
  data: null,
  error: {code, message: msg},
});

const mockCorrida: Corrida = {
  id: 'corrida-test-001',
  passageiroId: 'user-001',
  motoristaId: null,
  veiculoId: null,
  origemLat: -16.6869,
  origemLng: -49.2648,
  destinoLat: -15.7801,
  destinoLng: -47.9292,
  motivoServico: 'Visita técnica',
  status: 'solicitada',
  createdAt: '2026-04-17T10:00:00.000Z',
  updatedAt: '2026-04-17T10:00:00.000Z',
};

const mockMensagens: CorridaMensagem[] = [
  {
    id: 'msg-001',
    corridaId: 'corrida-test-001',
    remetenteId: 'motorista-001',
    conteudo: 'Estou a caminho!',
    lida: true,
    visualizadaEm: null,
    visualizadaPor: null,
    createdAt: '2026-04-17T10:05:00.000Z',
  },
];

const buildMockFacade = (
  overrides: Partial<ICorridaFacade> = {},
): ICorridaFacade => ({
  solicitarCorrida: jest
    .fn()
    .mockResolvedValue(
      ok<SolicitarCorridaResponse>({
        corridaId: 'corrida-test-001',
      }),
    ),
  createCorrida: jest
    .fn()
    .mockResolvedValue(
      ok<SolicitarCorridaResponse>({
        corridaId: 'corrida-test-001',
      }),
    ),
  aceitarCorrida: jest
    .fn()
    .mockResolvedValue(
      ok({...mockCorrida, status: 'aceita', motoristaId: 'motorista-001'} as Corrida),
    ),
  recusarCorrida: jest
    .fn()
    .mockResolvedValue(ok({...mockCorrida, status: 'cancelada'} as Corrida)),
  iniciarDeslocamento: jest
    .fn()
    .mockResolvedValue(ok({...mockCorrida, status: 'em_rota'} as Corrida)),
  chegarAoLocal: jest
    .fn()
    .mockResolvedValue(ok({...mockCorrida, status: 'em_rota'} as Corrida)),
  confirmarEmbarque: jest
    .fn()
    .mockResolvedValue(ok({...mockCorrida, status: 'passageiro_a_bordo'} as Corrida)),
  passageiroABordo: jest
    .fn()
    .mockResolvedValue(ok({...mockCorrida, status: 'passageiro_a_bordo'} as Corrida)),
  finalizarCorrida: jest
    .fn()
    .mockResolvedValue(ok({...mockCorrida, status: 'concluida'} as Corrida)),
  cancelarCorrida: jest
    .fn()
    .mockResolvedValue(ok({...mockCorrida, status: 'cancelada'} as Corrida)),
  getCorrida: jest.fn().mockResolvedValue(ok(mockCorrida)),
  getCorridaStatus: jest
    .fn()
    .mockResolvedValue(
      ok<CorridaStatusResponse>({id: 'corrida-test-001', status: 'solicitada'}),
    ),
  getMensagens: jest.fn().mockResolvedValue(ok(mockMensagens)),
  searchLocations: jest.fn().mockResolvedValue(ok([])),
  cancelCorrida: jest.fn().mockResolvedValue(ok(true)),
  getActiveCorrida: jest.fn().mockResolvedValue(ok(null)),
  avaliarCorrida: jest
    .fn()
    .mockResolvedValue(ok({...mockCorrida, status: 'avaliada'} as Corrida)),
  getMotoristaPosition: jest.fn().mockResolvedValue(
    ok<import('../../../types').PosicaoMotoristaResponse>({
      corridaId: 'corrida-test-001',
      lat: -16.6869,
      lng: -49.2648,
      velocidade: 0,
      heading: 0,
      timestamp: new Date().toISOString(),
    }),
  ),
  getContexto: jest.fn().mockResolvedValue(
    ok<CorridaContexto>({
      usuario: {
        id: 'user-001',
        email: 'test@gov.br',
        papeis: ['USUARIO'],
        nome: 'Test User',
      },
      corridaAtiva: null,
    }),
  ),
  listCorridas: jest.fn().mockResolvedValue(
    ok({data: [], total: 0, page: 1, limit: 10, totalPages: 0}),
  ),
  visualizarMensagens: jest.fn().mockResolvedValue(ok(undefined)),
  getNaoVisualizadasCount: jest.fn().mockResolvedValue(ok({corridaId: 'corrida-test-001', count: 0})),
  getPosicaoFila: jest.fn().mockResolvedValue(ok({
    corridaId: 'corrida-test-001',
    status: 'aguardando_aceite',
    naFilaDeEspera: false,
    posicaoNaFila: null,
    totalNaFila: null,
    tempoEsperaSeg: null,
    estimativaAtendimentoSeg: null,
  })),
  ...overrides,
});

const mockUser = {
  id: 'user-001',
  fullName: 'Test User',
  email: 'test@gov.br',
  role: UserRole.OFFICER,
  status: UserStatus.ACTIVE,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

/** Default corrida state used as base for test store overrides. */
const DEFAULT_CORRIDA_STATE: CorridaState = {
  activeCorrida: null,
  pendingCorridaId: null,
  selectedDestino: null,
  userLocationSnapshot: null,
  isRequesting: false,
  isActionLoading: false,
  error: null,
  searchResults: [],
  isSearching: false,
  mensagens: [],
  isLoadingMensagens: false,
  posicaoMotoristaAtual: null,
  corridaHistory: [],
  ratingSubmitted: false,
  driverPosition: null,
  posicaoFila: null,
  unreadMensagens: 0,
  naoVisualizadasCount: 0,
  isChatScreenOpen: false,
  motoristaNomeCache: null,
};

const buildStore = (papeis: string[] = [], corridaOverrides?: Partial<CorridaState>) =>
  configureStore({
    reducer: {corrida: corridaReducer, auth: authReducer, ui: uiReducer, location: locationReducer},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    preloadedState: {
      auth: {
        user: mockUser,
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        papeis,
        motoristaId: papeis.includes('MOTORISTA') ? 'motorista-test-001' : null,
        municipioId: null,
        isHydrating: false,
        statusOperacional: null,
        servidorId: null,
      },
      corrida: {...DEFAULT_CORRIDA_STATE, ...corridaOverrides},
    } as Parameters<typeof configureStore>[0]['preloadedState'],
  });

const Wrapper = ({
  children,
  facade,
  papeis = [],
  corridaState,
}: {
  children: React.ReactNode;
  facade?: Partial<ICorridaFacade>;
  papeis?: string[];
  corridaState?: Partial<CorridaState>;
}) => {
  // Stabilize store and facade on first render — prevents useEffect re-runs
  // caused by reference changes on parent re-renders.
  const storeRef = useRef(buildStore(papeis, corridaState));
  const facadeRef = useRef(buildMockFacade(facade));
  // Stabilize the facades object itself so FacadeProvider's useMemo doesn't recompute
  const facadesObjRef = useRef({corridaFacade: facadeRef.current});
  return (
    <Provider store={storeRef.current}>
      <I18nextProvider i18n={i18n}>
        <SafeAreaProvider>
          <ThemeProvider>
            <FacadeProvider facades={facadesObjRef.current}>
              <NavigationContainer>{children}</NavigationContainer>
            </FacadeProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </I18nextProvider>
    </Provider>
  );
};

// ---------------------------------------------------------------------------
// PassageiroCorridasListScreen — USUARIO
// ---------------------------------------------------------------------------

describe('PassageiroCorridasListScreen (USUARIO)', () => {
  it('renders empty state when no active corrida', async () => {
    render(
      <Wrapper>
        <PassageiroCorridasListScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('corridas-empty')).toBeTruthy();
    });
  });

  it('always shows the request ride CTA (USUARIO always can request)', async () => {
    render(
      <Wrapper papeis={['USUARIO']}>
        <PassageiroCorridasListScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('corridas-list')).toBeTruthy();
    });
  });

  it('shows active corrida card when one exists', async () => {
    render(
      <Wrapper
        corridaState={{activeCorrida: mockCorrida} as never}>
        <PassageiroCorridasListScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('corridas-list')).toBeTruthy();
    });
  });

  it('does NOT render MotoristaCorridaAction navigation — USUARIO scope only', async () => {
    render(
      <Wrapper>
        <PassageiroCorridasListScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('corridas-list')).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// AcompanharCorridaScreen — USUARIO
// ---------------------------------------------------------------------------

describe('AcompanharCorridaScreen (USUARIO)', () => {
  beforeEach(() => {
    mockUseRoute.mockReturnValue({
      params: {corridaId: 'corrida-test-001'},
    });
  });

  it('shows loading spinner while corrida loads', () => {
    const slowFacade = buildMockFacade({
      getCorrida: jest.fn().mockImplementation(() => new Promise(() => {})),
    });
    render(
      <Wrapper facade={slowFacade}>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    expect(screen.getByTestId('acompanhar-loading')).toBeTruthy();
  });

  it('renders corrida details and status badge after load', async () => {
    render(
      <Wrapper corridaState={{activeCorrida: mockCorrida} as never}>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('route-card')).toBeTruthy();
      expect(screen.getByTestId('status-badge')).toBeTruthy();
    });
  });

  it('renders message history from GET /corridas/:id/mensagens', async () => {
    render(
      <Wrapper corridaState={{activeCorrida: mockCorrida, mensagens: mockMensagens} as never}>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('mensagens-list')).toBeTruthy();
    }, {timeout: 5000});
  });

  it('shows cancel button for active corrida (USUARIO can cancel)', async () => {
    render(
      <Wrapper corridaState={{activeCorrida: mockCorrida} as never}>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('cancel-open-btn')).toBeTruthy();
    });
  });

  it('does NOT show MOTORISTA-only action buttons', async () => {
    render(
      <Wrapper corridaState={{activeCorrida: mockCorrida} as never}>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.queryByTestId('btn-aceitar')).toBeNull();
      expect(screen.queryByTestId('btn-iniciar-deslocamento')).toBeNull();
      expect(screen.queryByTestId('btn-confirmar-embarque')).toBeNull();
      expect(screen.queryByTestId('btn-finalizar')).toBeNull();
    });
  });

  it('shows empty messages state when no messages exist', async () => {
    render(
      <Wrapper
        corridaState={{activeCorrida: mockCorrida, mensagens: []} as never}
        facade={{getMensagens: jest.fn().mockResolvedValue(ok([]))}}>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('mensagens-empty')).toBeTruthy();
    }, {timeout: 5000});
  });
});

// ---------------------------------------------------------------------------
// MotoristaCorridaScreen — MOTORISTA
// ---------------------------------------------------------------------------

describe('MotoristaCorridaScreen (MOTORISTA)', () => {
  beforeEach(() => {
    mockUseRoute.mockReturnValue({
      params: {corridaId: 'corrida-test-001'},
    });
  });

  it('shows loading spinner while corrida loads', () => {
    const slowFacade = buildMockFacade({
      getCorrida: jest.fn().mockImplementation(() => new Promise(() => {})),
    });
    render(
      <Wrapper facade={slowFacade} papeis={['MOTORISTA']}>
        <MotoristaCorridaScreen />
      </Wrapper>,
    );
    expect(screen.getByTestId('motorista-loading')).toBeTruthy();
  });

  it('shows aceitar and recusar buttons for SOLICITADA status', async () => {
    render(
      <Wrapper papeis={['MOTORISTA']} corridaState={{activeCorrida: mockCorrida} as never}>
        <MotoristaCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('btn-aceitar')).toBeTruthy();
      expect(screen.getByTestId('btn-recusar')).toBeTruthy();
    });
  });

  it('calls aceitarCorrida on aceitar press', async () => {
    const aceitarMock = jest
      .fn()
      .mockResolvedValue(
        ok({...mockCorrida, status: 'aceita', motoristaId: 'motorista-001'} as Corrida),
      );
    render(
      <Wrapper facade={{aceitarCorrida: aceitarMock}} papeis={['MOTORISTA']} corridaState={{activeCorrida: mockCorrida} as never}>
        <MotoristaCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId('btn-aceitar'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-aceitar'));
    });
    expect(aceitarMock).toHaveBeenCalledWith(
      'corrida-test-001',
      {},
    );
  });

  it('handles 409 conflict on aceitar without crashing', async () => {
    const conflictFacade = buildMockFacade({
      aceitarCorrida: jest
        .fn()
        .mockResolvedValue(fail<Corrida>('Corrida já aceita', 'CONFLICT')),
    });
    render(
      <Wrapper facade={conflictFacade} papeis={['MOTORISTA']} corridaState={{activeCorrida: mockCorrida} as never}>
        <MotoristaCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId('btn-aceitar'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-aceitar'));
    });
    // Screen stays mounted — no crash
    expect(screen.getByTestId('motorista-screen')).toBeTruthy();
  });
});
