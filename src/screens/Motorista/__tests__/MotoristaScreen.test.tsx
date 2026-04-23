/**
 * @fileoverview POC tests for the MotoristaScreen.
 *
 * Covers: loading, idle (no active ride), active ride panel,
 * lifecycle action buttons, and error/terminal states.
 */
import React from 'react';
import {render, fireEvent, waitFor, act} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {NavigationContainer} from '@react-navigation/native';
import {I18nextProvider} from 'react-i18next';
import {i18n} from '../../../i18n';
import {ThemeProvider} from '@theme/index';
import {FacadeProvider} from '@services/facades';
import {MotoristaScreen} from '../MotoristaScreen';

// Mock useMotoristaRealtime to prevent it from clearing terminal corrida state in tests
jest.mock('../useMotoristaRealtime', () => ({
  useMotoristaRealtime: () => ({pendingOffer: null, dismissOffer: jest.fn()}),
}));

import corridaReducer from '@store/slices/corridaSlice';
import authReducer from '@store/slices/authSlice';
import realtimeReducer from '@store/slices/realtimeSlice';
import uiReducer from '@store/slices/uiSlice';
import locationReducer from '@store/slices/locationSlice';
import type {ICorridaFacade} from '@services/facades/CorridaFacade';
import type {IRealtimeFacade} from '@services/facades/RealtimeFacade';
import type {FacadeError, Result} from '@services/facades/types';
import type {Corrida, CorridaMensagem} from '@models/Corrida';
import type {
  SolicitarCorridaResponse,
  CorridaStatusResponse,
  CorridaContexto,
  AvaliarCorridaInput,
  AceitarCorridaInput,
  RecusarCorridaInput,
  ConfirmarEmbarqueInput,
  FinalizarCorridaInput,
  CancelarCorridaInput,
  CreateCorridaInput,
  PosicaoMotoristaResponse,
  SolicitarCorridaInput,
  SearchResult,
} from '../../../types';
import type {MotoristaStatusOperacional} from '@models/Motorista';

// ── Helpers ──────────────────────────────────────────────────────────────────

const ok = <T,>(data: T): Result<T, FacadeError> => ({data, error: null});

const makeCorrida = (overrides: Partial<Corrida> = {}): Corrida => ({
  id: 'corrida-test-001',
  passageiroId: 'passageiro-001',
  motoristaId: null,
  veiculoId: null,
  origemLat: -15.78,
  origemLng: -47.93,
  destinoLat: -15.8,
  destinoLng: -47.95,
  motivoServico: 'Visita técnica',
  status: 'solicitada',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

/** Minimal mock facade — override per test. */
const makeMockFacade = (
  overrides: Partial<ICorridaFacade> = {},
): ICorridaFacade => ({
  solicitarCorrida: async (
    _i: SolicitarCorridaInput,
  ): Promise<Result<SolicitarCorridaResponse, FacadeError>> =>
    ok({corridaId: 'c1', status: 'solicitada'}),
  createCorrida: async (
    _i: CreateCorridaInput,
  ): Promise<Result<SolicitarCorridaResponse, FacadeError>> =>
    ok({corridaId: 'c1', status: 'solicitada'}),
  aceitarCorrida: async (
    _id: string,
    _i: AceitarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> =>
    ok(makeCorrida({status: 'aceita'})),
  recusarCorrida: async (
    _id: string,
    _i: RecusarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> =>
    ok(makeCorrida({status: 'cancelada'})),
  iniciarDeslocamento: async (
    _id: string,
  ): Promise<Result<Corrida, FacadeError>> =>
    ok(makeCorrida({status: 'em_rota'})),
  chegarAoLocal: async (_id: string): Promise<Result<Corrida, FacadeError>> =>
    ok(makeCorrida({status: 'em_rota'})),
  confirmarEmbarque: async (
    _id: string,
    _i: ConfirmarEmbarqueInput,
  ): Promise<Result<Corrida, FacadeError>> =>
    ok(makeCorrida({status: 'passageiro_a_bordo'})),
  passageiroABordo: async (
    _id: string,
  ): Promise<Result<Corrida, FacadeError>> =>
    ok(makeCorrida({status: 'passageiro_a_bordo'})),
  finalizarCorrida: async (
    _id: string,
    _i: FinalizarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> =>
    ok(makeCorrida({status: 'concluida'})),
  cancelarCorrida: async (
    _id: string,
    _i: CancelarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> =>
    ok(makeCorrida({status: 'cancelada'})),
  getCorrida: async (_id: string): Promise<Result<Corrida, FacadeError>> =>
    ok(makeCorrida()),
  getCorridaStatus: async (
    _id: string,
  ): Promise<Result<CorridaStatusResponse, FacadeError>> =>
    ok({id: 'c1', status: 'solicitada'}),
  getMensagens: async (
    _id: string,
  ): Promise<Result<CorridaMensagem[], FacadeError>> => ok([]),
  searchLocations: async (
    _q: string,
  ): Promise<Result<SearchResult[], FacadeError>> => ok([]),
  cancelCorrida: async (
    _id: string,
    _r: string,
  ): Promise<Result<boolean, FacadeError>> => ok(true),
  getActiveCorrida: async (): Promise<Result<Corrida | null, FacadeError>> =>
    ok(null),
  avaliarCorrida: async (
    _id: string,
    _i: AvaliarCorridaInput,
  ): Promise<Result<Corrida, FacadeError>> =>
    ok(makeCorrida({status: 'avaliada'})),
  getMotoristaPosition: async (
    _id: string,
  ): Promise<Result<PosicaoMotoristaResponse, FacadeError>> =>
    ok({
      corridaId: 'c1',
      lat: -15.78,
      lng: -47.93,
      velocidade: 0,
      heading: 0,
      timestamp: new Date().toISOString(),
    }),
  getContexto: async (): Promise<Result<CorridaContexto, FacadeError>> =>
    ok({
      usuario: {
        id: 'u1',
        email: 'driver@gov.br',
        papeis: ['MOTORISTA'],
        nome: 'Driver',
      },
      corridaAtiva: null,
    }),
  ...overrides,
} as ICorridaFacade);

const makeStore = (corridaState?: Partial<ReturnType<typeof corridaReducer>>) =>
  configureStore({
    reducer: {
      corrida: corridaReducer,
      auth: authReducer,
      realtime: realtimeReducer,
      ui: uiReducer,
      location: locationReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'driver-001',
          fullName: 'Driver Test',
          email: 'driver@gov.br',
          role: 'MOTORISTA' as never,
          status: 'ACTIVE' as never,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        papeis: ['MOTORISTA'],
        motoristaId: 'driver-001',
        municipioId: null,
        isHydrating: false,
        statusOperacional: 'DISPONIVEL' as MotoristaStatusOperacional,
        servidorId: null,
      } satisfies ReturnType<typeof authReducer>,
      corrida: {
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
        ...corridaState,
        ratingSubmitted: corridaState?.ratingSubmitted ?? false,
        driverPosition: corridaState?.driverPosition ?? null,
        posicaoFila: corridaState?.posicaoFila ?? null,
        unreadMensagens: corridaState?.unreadMensagens ?? 0,
        naoVisualizadasCount: corridaState?.naoVisualizadasCount ?? 0,
        isChatScreenOpen: corridaState?.isChatScreenOpen ?? false,
        motoristaNomeCache: corridaState?.motoristaNomeCache ?? null,
      },
      location: {
        permissionStatus: 'granted' as const,
        fixStatus: 'ready' as const,
        current: {latitude: -15.78, longitude: -47.93},
        lastKnown: {latitude: -15.78, longitude: -47.93},
        lastFixAt: Date.now(),
        error: null,
      },
    },
  });

const makeRealtimeFacade = (): IRealtimeFacade =>
  ({
    connect: jest.fn().mockResolvedValue({data: 'connected', error: null}),
    disconnect: jest.fn(),
    clearCorridaSubscriptions: jest.fn(),
    subscribeToCorrida: jest.fn().mockResolvedValue({data: true, error: null}),
    setDriverAvailable: jest.fn().mockResolvedValue({data: true, error: null}),
    updateDriverPosition: jest
      .fn()
      .mockResolvedValue({data: true, error: null}),
    sendCorridaMessage: jest.fn().mockResolvedValue({data: true, error: null}),
    onEvent: jest.fn(() => () => undefined),
    onConnectionStatusChange: jest.fn(() => () => undefined),
    mapCorridaStatus: jest.fn(() => null),
    normalizeCorridaMensagem: jest.fn((payload: CorridaMensagem) => payload),
  }) as unknown as IRealtimeFacade;

const Wrapper = ({
  store,
  facade,
  realtimeFacade,
  children,
}: {
  store: ReturnType<typeof makeStore>;
  facade: ICorridaFacade;
  realtimeFacade: IRealtimeFacade;
  children: React.ReactNode;
}) => (
  <Provider store={store}>
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <FacadeProvider facades={{corridaFacade: facade, realtimeFacade}}>
          <NavigationContainer>{children}</NavigationContainer>
        </FacadeProvider>
      </ThemeProvider>
    </I18nextProvider>
  </Provider>
);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MotoristaScreen', () => {
  it('renders the idle sheet when no active ride', async () => {
    const store = makeStore();
    const facade = makeMockFacade();
    const realtimeFacade = makeRealtimeFacade();

    const {getByTestId} = render(
      <Wrapper store={store} facade={facade} realtimeFacade={realtimeFacade}>
        <MotoristaScreen />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(getByTestId('idle-sheet')).toBeTruthy();
    });
  });

  it('renders the active ride sheet when a SOLICITADA ride is in Redux', async () => {
    const corrida = makeCorrida({status: 'solicitada'});
    const store = makeStore({activeCorrida: corrida});
    const realtimeFacade = makeRealtimeFacade();
    const facade = makeMockFacade({
      getContexto: async () =>
        ok({
          usuario: {
            id: 'u1',
            email: 'driver@gov.br',
            papeis: ['MOTORISTA'],
            nome: 'Driver',
          },
          corridaAtiva: corrida,
        }),
    });

    const {getByTestId} = render(
      <Wrapper store={store} facade={facade} realtimeFacade={realtimeFacade}>
        <MotoristaScreen />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(getByTestId('active-ride-sheet')).toBeTruthy();
    });
    expect(getByTestId('btn-aceitar')).toBeTruthy();
    expect(getByTestId('btn-recusar')).toBeTruthy();
  });

  it('calls aceitarCorrida when Aceitar button is pressed', async () => {
    const corrida = makeCorrida({status: 'solicitada'});
    const store = makeStore({activeCorrida: corrida});
    const aceitarMock = jest
      .fn()
      .mockResolvedValue(ok(makeCorrida({status: 'aceita'})));
    const realtimeFacade = makeRealtimeFacade();
    const facade = makeMockFacade({
      aceitarCorrida: aceitarMock,
      getContexto: async () =>
        ok({
          usuario: {
            id: 'u1',
            email: 'driver@gov.br',
            papeis: ['MOTORISTA'],
            nome: 'Driver',
          },
          corridaAtiva: corrida,
        }),
    });

    const {getByTestId} = render(
      <Wrapper store={store} facade={facade} realtimeFacade={realtimeFacade}>
        <MotoristaScreen />
      </Wrapper>,
    );

    await waitFor(() => expect(getByTestId('btn-aceitar')).toBeTruthy(), {
      timeout: 3000,
    });

    await act(async () => {
      fireEvent.press(getByTestId('btn-aceitar'));
    });

    expect(aceitarMock).toHaveBeenCalledWith(
      corrida.id,
      {},
    );
  });

  it('shows the terminal sheet when ride is FINALIZADA', async () => {
    const corrida = makeCorrida({status: 'concluida'});
    const store = makeStore({activeCorrida: corrida});
    const facade = makeMockFacade({
      getContexto: async () =>
        ok({
          usuario: {id: 'u1', email: 'driver@gov.br', papeis: ['MOTORISTA'], nome: 'Driver'},
          corridaAtiva: corrida,
        }),
    });
    const realtimeFacade = makeRealtimeFacade();

    const {getByTestId} = render(
      <Wrapper store={store} facade={facade} realtimeFacade={realtimeFacade}>
        <MotoristaScreen />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(getByTestId('terminal-sheet')).toBeTruthy();
    });
  });

  it('shows the Iniciar Deslocamento button when ride is ACEITA', async () => {
    const corrida = makeCorrida({status: 'aceita', motoristaId: 'driver-001'});
    const store = makeStore({activeCorrida: corrida});
    const facade = makeMockFacade();
    const realtimeFacade = makeRealtimeFacade();

    const {getByTestId} = render(
      <Wrapper store={store} facade={facade} realtimeFacade={realtimeFacade}>
        <MotoristaScreen />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(getByTestId('btn-iniciar-deslocamento')).toBeTruthy();
    });
  });

  it('shows the Finalizar button when ride is PASSAGEIRO_EMBARCADO', async () => {
    const corrida = makeCorrida({
      status: 'passageiro_a_bordo',
      motoristaId: 'driver-001',
    });
    const store = makeStore({activeCorrida: corrida});
    const facade = makeMockFacade();
    const realtimeFacade = makeRealtimeFacade();

    const {getByTestId} = render(
      <Wrapper store={store} facade={facade} realtimeFacade={realtimeFacade}>
        <MotoristaScreen />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(getByTestId('btn-finalizar')).toBeTruthy();
    });
  });

  it('shows the map fallback when Mapbox is not installed', async () => {
    const store = makeStore();
    const facade = makeMockFacade();
    const realtimeFacade = makeRealtimeFacade();

    const {getByTestId} = render(
      <Wrapper store={store} facade={facade} realtimeFacade={realtimeFacade}>
        <MotoristaScreen />
      </Wrapper>,
    );

    // In test environment Mapbox is not installed — fallback should render
    await waitFor(() => {
      expect(getByTestId('map-fallback')).toBeTruthy();
    });
  });
});
