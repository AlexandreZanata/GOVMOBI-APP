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
import {ThemeProvider} from '../../../theme';
import {FacadeProvider} from '@services/facades';
import {MotoristaScreen} from '../MotoristaScreen';
import corridaReducer from '@store/slices/corridaSlice';
import authReducer from '@store/slices/authSlice';
import uiReducer from '@store/slices/uiSlice';
import type {ICorridaFacade} from '@services/facades/CorridaFacade';
import type {FacadeError, Result} from '@services/facades/types';
import type {Corrida, CorridaMensagem} from '@models/Corrida';
import type {
  SolicitarCorridaResponse,
  CorridaStatusResponse,
  CorridaContexto,
  AceitarCorridaInput,
  RecusarCorridaInput,
  ConfirmarEmbarqueInput,
  FinalizarCorridaInput,
  CancelarCorridaInput,
  CreateCorridaInput,
  SolicitarCorridaInput,
  SearchResult,
} from '../../../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const ok = <T,>(data: T): Result<T, FacadeError> => ({data, error: null});

const makeCorrida = (overrides: Partial<Corrida> = {}): Corrida => ({
  id: 'corrida-test-001',
  passageiroId: 'passageiro-001',
  motoristaId: null,
  veiculoId: null,
  origemLat: -15.78,
  origemLng: -47.93,
  destinoLat: -15.80,
  destinoLng: -47.95,
  motivoServico: 'Visita técnica',
  status: 'SOLICITADA',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

/** Minimal mock facade — override per test. */
const makeMockFacade = (overrides: Partial<ICorridaFacade> = {}): ICorridaFacade => ({
  solicitarCorrida: async (_i: SolicitarCorridaInput): Promise<Result<SolicitarCorridaResponse, FacadeError>> => ok({corridaId: 'c1', status: 'SOLICITADA'}),
  createCorrida: async (_i: CreateCorridaInput): Promise<Result<SolicitarCorridaResponse, FacadeError>> => ok({corridaId: 'c1', status: 'SOLICITADA'}),
  aceitarCorrida: async (_id: string, _i: AceitarCorridaInput): Promise<Result<Corrida, FacadeError>> => ok(makeCorrida({status: 'ACEITA'})),
  recusarCorrida: async (_id: string, _i: RecusarCorridaInput): Promise<Result<Corrida, FacadeError>> => ok(makeCorrida({status: 'RECUSADA'})),
  iniciarDeslocamento: async (_id: string): Promise<Result<Corrida, FacadeError>> => ok(makeCorrida({status: 'EM_DESLOCAMENTO'})),
  confirmarEmbarque: async (_id: string, _i: ConfirmarEmbarqueInput): Promise<Result<Corrida, FacadeError>> => ok(makeCorrida({status: 'PASSAGEIRO_EMBARCADO'})),
  finalizarCorrida: async (_id: string, _i: FinalizarCorridaInput): Promise<Result<Corrida, FacadeError>> => ok(makeCorrida({status: 'FINALIZADA'})),
  cancelarCorrida: async (_id: string, _i: CancelarCorridaInput): Promise<Result<Corrida, FacadeError>> => ok(makeCorrida({status: 'CANCELADA'})),
  getCorrida: async (_id: string): Promise<Result<Corrida, FacadeError>> => ok(makeCorrida()),
  getCorridaStatus: async (_id: string): Promise<Result<CorridaStatusResponse, FacadeError>> => ok({id: 'c1', status: 'SOLICITADA'}),
  getMensagens: async (_id: string): Promise<Result<CorridaMensagem[], FacadeError>> => ok([]),
  searchLocations: async (_q: string): Promise<Result<SearchResult[], FacadeError>> => ok([]),
  cancelCorrida: async (_id: string, _r: string): Promise<Result<boolean, FacadeError>> => ok(true),
  getActiveCorrida: async (): Promise<Result<Corrida | null, FacadeError>> => ok(null),
  getContexto: async (): Promise<Result<CorridaContexto, FacadeError>> => ok({
    usuario: {id: 'u1', email: 'driver@gov.br', papeis: ['MOTORISTA'], nome: 'Driver'},
    corridaAtiva: null,
  }),
  ...overrides,
});

const makeStore = (corridaState?: Partial<ReturnType<typeof corridaReducer>>) =>
  configureStore({
    reducer: {corrida: corridaReducer, auth: authReducer, ui: uiReducer},
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
      },
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
      },
    },
  });

const Wrapper = ({
  store,
  facade,
  children,
}: {
  store: ReturnType<typeof makeStore>;
  facade: ICorridaFacade;
  children: React.ReactNode;
}) => (
  <Provider store={store}>
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <FacadeProvider facades={{corridaFacade: facade}}>
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

    const {getByTestId} = render(
      <Wrapper store={store} facade={facade}>
        <MotoristaScreen />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(getByTestId('motorista-home-screen')).toBeTruthy();
    });

    await waitFor(() => {
      expect(getByTestId('idle-sheet')).toBeTruthy();
    });
  });

  it('renders the active ride sheet when a SOLICITADA ride is in Redux', async () => {
    const corrida = makeCorrida({status: 'SOLICITADA'});
    const store = makeStore({activeCorrida: corrida});
    const facade = makeMockFacade({
      getContexto: async () =>
        ok({
          usuario: {id: 'u1', email: 'driver@gov.br', papeis: ['MOTORISTA'], nome: 'Driver'},
          corridaAtiva: corrida,
        }),
    });

    const {getByTestId} = render(
      <Wrapper store={store} facade={facade}>
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
    const corrida = makeCorrida({status: 'SOLICITADA'});
    const store = makeStore({activeCorrida: corrida});
    const aceitarMock = jest.fn().mockResolvedValue(ok(makeCorrida({status: 'ACEITA'})));
    const facade = makeMockFacade({
      aceitarCorrida: aceitarMock,
      getContexto: async () =>
        ok({
          usuario: {id: 'u1', email: 'driver@gov.br', papeis: ['MOTORISTA'], nome: 'Driver'},
          corridaAtiva: corrida,
        }),
    });

    const {getByTestId} = render(
      <Wrapper store={store} facade={facade}>
        <MotoristaScreen />
      </Wrapper>,
    );

    await waitFor(() => expect(getByTestId('btn-aceitar')).toBeTruthy(), {timeout: 3000});

    await act(async () => {
      fireEvent.press(getByTestId('btn-aceitar'));
    });

    expect(aceitarMock).toHaveBeenCalledWith(
      corrida.id,
      expect.objectContaining({motoristaId: 'driver-001'}),
    );
  });

  it('shows the terminal sheet when ride is FINALIZADA', async () => {
    const corrida = makeCorrida({status: 'FINALIZADA'});
    const store = makeStore({activeCorrida: corrida});
    const facade = makeMockFacade();

    const {getByTestId} = render(
      <Wrapper store={store} facade={facade}>
        <MotoristaScreen />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(getByTestId('terminal-sheet')).toBeTruthy();
    });
  });

  it('shows the Iniciar Deslocamento button when ride is ACEITA', async () => {
    const corrida = makeCorrida({status: 'ACEITA', motoristaId: 'driver-001'});
    const store = makeStore({activeCorrida: corrida});
    const facade = makeMockFacade();

    const {getByTestId} = render(
      <Wrapper store={store} facade={facade}>
        <MotoristaScreen />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(getByTestId('btn-iniciar-deslocamento')).toBeTruthy();
    });
  });

  it('shows the Finalizar button when ride is PASSAGEIRO_EMBARCADO', async () => {
    const corrida = makeCorrida({status: 'PASSAGEIRO_EMBARCADO', motoristaId: 'driver-001'});
    const store = makeStore({activeCorrida: corrida});
    const facade = makeMockFacade();

    const {getByTestId} = render(
      <Wrapper store={store} facade={facade}>
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

    const {getByTestId} = render(
      <Wrapper store={store} facade={facade}>
        <MotoristaScreen />
      </Wrapper>,
    );

    // In test environment Mapbox is not installed — fallback should render
    await waitFor(() => {
      expect(getByTestId('map-fallback')).toBeTruthy();
    });
  });
});
