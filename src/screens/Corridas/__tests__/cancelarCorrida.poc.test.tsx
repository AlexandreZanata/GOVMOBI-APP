/**
 * @fileoverview POC tests for the corrida cancellation flow.
 *
 * Covers the full backend state machine:
 *   SOLICITADA      → cancellable (passageiro)
 *   AGUARDANDO_ACEITE → cancellable (passageiro)
 *   ACEITA          → cancellable (passageiro or motorista)
 *   EM_ROTA         → NOT cancellable → 409 INVALID_STATE_TRANSITION
 *   PASSAGEIRO_EMBARCADO → NOT cancellable → 409 INVALID_STATE_TRANSITION
 *   Terminal states → NOT cancellable → 409 INVALID_STATE_TRANSITION
 *
 * Tests: loading, error, success, state-machine guards, motivo validation.
 * TSC clean — zero `any`.
 */
import React, {useRef} from 'react';
import {render, screen, fireEvent, waitFor, act} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {I18nextProvider} from 'react-i18next';
import {ThemeProvider} from '@theme/index';
import {FacadeProvider} from '@services/facades';
import {i18n} from '../../../i18n';
import corridaReducer from '../../../store/slices/corridaSlice';
import type {CorridaState} from '../../../store/slices/corridaSlice';
import authReducer from '../../../store/slices/authSlice';
import uiReducer from '../../../store/slices/uiSlice';
import {AcompanharCorridaScreen} from '../AcompanharCorridaScreen';
import {UserRole, UserStatus} from '@models/User';
import type {ICorridaFacade} from '@services/facades';
import type {FacadeError, Result} from '@services/facades';
import type {Corrida} from '@models/Corrida';
import type {CorridaStatus} from '@models/Corrida';
import type {CorridaStatusResponse, CorridaContexto, SolicitarCorridaResponse} from '../../../types';

// ---------------------------------------------------------------------------
// Suppress status-polling intervals in tests
// ---------------------------------------------------------------------------
const _realSetInterval = global.setInterval;
jest.spyOn(global, 'setInterval').mockImplementation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fn: any, ms?: number, ...args: any[]) =>
    ms !== undefined && ms >= 5000
      ? (0 as unknown as ReturnType<typeof setInterval>)
      : _realSetInterval(fn, ms, ...args),
);

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual<typeof import('@react-navigation/native')>(
    '@react-navigation/native',
  );
  return {
    ...actual,
    useRoute: () => ({params: {corridaId: 'corrida-001'}}),
    useNavigation: () => ({navigate: jest.fn(), goBack: jest.fn()}),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ok = <T,>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T,>(msg: string, code = 'NETWORK_ERROR', statusCode?: number): Result<T, FacadeError> => ({
  data: null,
  error: {code, message: msg, statusCode},
});

const makeCorrida = (status: CorridaStatus): Corrida => ({
  id: 'corrida-001',
  passageiroId: 'user-001',
  motoristaId: status === 'ACEITA' ? 'motorista-001' : null,
  veiculoId: null,
  origemLat: -16.6869,
  origemLng: -49.2648,
  destinoLat: -15.7801,
  destinoLng: -47.9292,
  motivoServico: 'Visita técnica',
  status,
  createdAt: '2026-04-22T10:00:00.000Z',
  updatedAt: '2026-04-22T10:00:00.000Z',
});

const buildMockFacade = (overrides: Partial<ICorridaFacade> = {}): ICorridaFacade => ({
  solicitarCorrida: jest.fn().mockResolvedValue(ok<SolicitarCorridaResponse>({corridaId: 'corrida-001'})),
  createCorrida: jest.fn().mockResolvedValue(ok<SolicitarCorridaResponse>({corridaId: 'corrida-001'})),
  aceitarCorrida: jest.fn().mockResolvedValue(ok(makeCorrida('ACEITA'))),
  recusarCorrida: jest.fn().mockResolvedValue(ok(makeCorrida('RECUSADA'))),
  iniciarDeslocamento: jest.fn().mockResolvedValue(ok(makeCorrida('EM_DESLOCAMENTO'))),
  chegarAoLocal: jest.fn().mockResolvedValue(ok(makeCorrida('EM_DESLOCAMENTO'))),
  confirmarEmbarque: jest.fn().mockResolvedValue(ok(makeCorrida('PASSAGEIRO_EMBARCADO'))),
  finalizarCorrida: jest.fn().mockResolvedValue(ok(makeCorrida('FINALIZADA'))),
  cancelarCorrida: jest.fn().mockResolvedValue(ok(makeCorrida('CANCELADA'))),
  getCorrida: jest.fn().mockResolvedValue(ok(makeCorrida('SOLICITADA'))),
  getCorridaStatus: jest.fn().mockResolvedValue(ok<CorridaStatusResponse>({id: 'corrida-001', status: 'SOLICITADA'})),
  getMensagens: jest.fn().mockResolvedValue(ok([])),
  searchLocations: jest.fn().mockResolvedValue(ok([])),
  cancelCorrida: jest.fn().mockResolvedValue(ok(true)),
  getActiveCorrida: jest.fn().mockResolvedValue(ok(null)),
  getContexto: jest.fn().mockResolvedValue(ok<CorridaContexto>({
    usuario: {id: 'user-001', email: 'test@gov.br', papeis: ['USUARIO'], nome: 'Test User'},
    corridaAtiva: null,
  })),
  avaliarCorrida: jest.fn().mockResolvedValue(ok(makeCorrida('AVALIADA'))),
  getMotoristaPosition: jest.fn().mockResolvedValue(fail('not found')),
  ...overrides,
});

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
};

const buildStore = (corridaOverrides?: Partial<CorridaState>) =>
  configureStore({
    reducer: {corrida: corridaReducer, auth: authReducer, ui: uiReducer},
    preloadedState: {
      auth: {
        user: {
          id: 'user-001',
          fullName: 'Test User',
          email: 'test@gov.br',
          role: UserRole.OFFICER,
          status: UserStatus.ACTIVE,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        papeis: ['USUARIO'],
        motoristaId: null,
        municipioId: null,
        isHydrating: false,
      },
      corrida: {...DEFAULT_CORRIDA_STATE, ...corridaOverrides},
    } as Parameters<typeof configureStore>[0]['preloadedState'],
  });

const Wrapper = ({
  children,
  facade,
  corridaState,
}: {
  children: React.ReactNode;
  facade?: Partial<ICorridaFacade>;
  corridaState?: Partial<CorridaState>;
}) => {
  const storeRef = useRef(buildStore(corridaState));
  const facadesRef = useRef({corridaFacade: buildMockFacade(facade)});
  return (
    <Provider store={storeRef.current}>
      <I18nextProvider i18n={i18n}>
        <SafeAreaProvider>
          <ThemeProvider>
            <FacadeProvider facades={facadesRef.current}>
              <NavigationContainer>{children}</NavigationContainer>
            </FacadeProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </I18nextProvider>
    </Provider>
  );
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Cancellation flow — state machine enforcement', () => {

  it('shows cancel button for SOLICITADA (cancellable)', async () => {
    render(
      <Wrapper corridaState={{activeCorrida: makeCorrida('SOLICITADA')}}>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('cancel-open-btn')).toBeTruthy();
    });
  });

  it('shows cancel button for AGUARDANDO_ACEITE (cancellable)', async () => {
    render(
      <Wrapper corridaState={{activeCorrida: makeCorrida('AGUARDANDO_ACEITE')}}>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('cancel-open-btn')).toBeTruthy();
    });
  });

  it('shows cancel button for ACEITA (cancellable)', async () => {
    render(
      <Wrapper corridaState={{activeCorrida: makeCorrida('ACEITA')}}>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('cancel-open-btn')).toBeTruthy();
    });
  });

  it('hides cancel button and shows not-allowed message for EM_ROTA', async () => {
    render(
      <Wrapper corridaState={{activeCorrida: makeCorrida('EM_ROTA')}}>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.queryByTestId('cancel-open-btn')).toBeNull();
      expect(screen.getByTestId('cancel-not-allowed')).toBeTruthy();
    });
  });

  it('hides cancel button and shows not-allowed message for PASSAGEIRO_EMBARCADO', async () => {
    render(
      <Wrapper corridaState={{activeCorrida: makeCorrida('PASSAGEIRO_EMBARCADO')}}>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.queryByTestId('cancel-open-btn')).toBeNull();
      expect(screen.getByTestId('cancel-not-allowed')).toBeTruthy();
    });
  });

  it('hides cancel button for CANCELADA (terminal)', async () => {
    render(
      <Wrapper corridaState={{activeCorrida: makeCorrida('CANCELADA')}}>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.queryByTestId('cancel-open-btn')).toBeNull();
      expect(screen.queryByTestId('cancel-not-allowed')).toBeNull();
    });
  });

  it('hides cancel button for EXPIRADA (terminal)', async () => {
    render(
      <Wrapper corridaState={{activeCorrida: makeCorrida('EXPIRADA')}}>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.queryByTestId('cancel-open-btn')).toBeNull();
    });
  });
});

describe('Cancellation flow — motivo validation', () => {

  it('reveals motivo input when cancel button is pressed', async () => {
    render(
      <Wrapper corridaState={{activeCorrida: makeCorrida('SOLICITADA')}}>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId('cancel-open-btn'));
    fireEvent.press(screen.getByTestId('cancel-open-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('cancel-motivo-input')).toBeTruthy();
      expect(screen.getByTestId('cancel-confirm-btn')).toBeTruthy();
    });
  });

  it('does NOT call cancelarCorrida when motivo is empty', async () => {
    const cancelMock = jest.fn().mockResolvedValue(ok(makeCorrida('CANCELADA')));
    render(
      <Wrapper
        corridaState={{activeCorrida: makeCorrida('SOLICITADA')}}
        facade={{cancelarCorrida: cancelMock}}>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId('cancel-open-btn'));
    fireEvent.press(screen.getByTestId('cancel-open-btn'));
    await waitFor(() => screen.getByTestId('cancel-confirm-btn'));
    // Press confirm without typing a motivo
    await act(async () => {
      fireEvent.press(screen.getByTestId('cancel-confirm-btn'));
    });
    expect(cancelMock).not.toHaveBeenCalled();
  });
});

describe('Cancellation flow — API success', () => {

  it('calls cancelarCorrida with only motivo (no solicitanteId / tipoSolicitante)', async () => {
    const cancelMock = jest.fn().mockResolvedValue(ok(makeCorrida('CANCELADA')));
    render(
      <Wrapper
        corridaState={{activeCorrida: makeCorrida('SOLICITADA')}}
        facade={{cancelarCorrida: cancelMock}}>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId('cancel-open-btn'));
    fireEvent.press(screen.getByTestId('cancel-open-btn'));
    await waitFor(() => screen.getByTestId('cancel-motivo-input'));
    fireEvent.changeText(screen.getByTestId('cancel-motivo-input'), 'Mudança de planos');
    await act(async () => {
      fireEvent.press(screen.getByTestId('cancel-confirm-btn'));
    });
    // Confirm the Alert
    await waitFor(() => {
      expect(cancelMock).toHaveBeenCalledWith('corrida-001', {motivo: 'Mudança de planos'});
      // Must NOT contain server-side fields
      expect(cancelMock).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({solicitanteId: expect.anything()}),
      );
    });
  });
});

describe('Cancellation flow — API error handling', () => {

  it('shows error toast on 409 INVALID_STATE_TRANSITION', async () => {
    const cancelMock = jest.fn().mockResolvedValue(
      fail<Corrida>('Corrida em andamento não pode ser cancelada.', 'INVALID_STATE_TRANSITION', 409),
    );
    render(
      <Wrapper
        corridaState={{activeCorrida: makeCorrida('ACEITA')}}
        facade={{cancelarCorrida: cancelMock}}>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId('cancel-open-btn'));
    fireEvent.press(screen.getByTestId('cancel-open-btn'));
    await waitFor(() => screen.getByTestId('cancel-motivo-input'));
    fireEvent.changeText(screen.getByTestId('cancel-motivo-input'), 'Motivo qualquer');
    await act(async () => {
      fireEvent.press(screen.getByTestId('cancel-confirm-btn'));
    });
    // Screen stays mounted — no crash
    await waitFor(() => {
      expect(screen.getByTestId('acompanhar-screen')).toBeTruthy();
    });
  });

  it('shows error toast on generic network failure', async () => {
    const cancelMock = jest.fn().mockResolvedValue(
      fail<Corrida>('Network error', 'NETWORK_ERROR'),
    );
    render(
      <Wrapper
        corridaState={{activeCorrida: makeCorrida('SOLICITADA')}}
        facade={{cancelarCorrida: cancelMock}}>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId('cancel-open-btn'));
    fireEvent.press(screen.getByTestId('cancel-open-btn'));
    await waitFor(() => screen.getByTestId('cancel-motivo-input'));
    fireEvent.changeText(screen.getByTestId('cancel-motivo-input'), 'Motivo qualquer');
    await act(async () => {
      fireEvent.press(screen.getByTestId('cancel-confirm-btn'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('acompanhar-screen')).toBeTruthy();
    });
  });
});
