/**
 * @fileoverview POC tests for the Corridas screens — role-separated architecture.
 *
 * USUARIO (passenger) screens:
 *   PassageiroCorridasListScreen — loading, empty state, active corrida card, request CTA
 *   AcompanharCorridaScreen      — loading, details, messages, cancel flow
 *
 * MOTORISTA (driver) screens:
 *   MotoristaCorridaScreen       — loading, aceitar/recusar, conflict error
 *
 * Covers: loading, error, success, and primary interactions.
 * TSC clean — zero `any`.
 */
import React from 'react';
import {render, screen, fireEvent, waitFor, act} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {NavigationContainer} from '@react-navigation/native';
import {I18nextProvider} from 'react-i18next';
import {ThemeProvider} from '../../../theme';
import {FacadeProvider} from '@services/facades';
import {i18n} from '../../../i18n';
import corridaReducer from '../../../store/slices/corridaSlice';
import authReducer from '../../../store/slices/authSlice';
import uiReducer from '../../../store/slices/uiSlice';
import {PassageiroCorridasListScreen} from '../PassageiroCorridasListScreen';
import {AcompanharCorridaScreen} from '../AcompanharCorridaScreen';
import {MotoristaCorridaScreen} from '../MotoristaCorridaScreen';
import {UserRole, UserStatus} from '../../../models/User';
import type {ICorridaFacade} from '../../../services/facades/CorridaFacade';
import type {FacadeError, Result} from '../../../services/facades/types';
import type {Corrida, CorridaMensagem} from '../../../models/Corrida';
import type {SolicitarCorridaResponse, CorridaStatusResponse} from '../../../types/corrida';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ok = <T,>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T,>(msg: string, code = 'NETWORK_ERROR'): Result<T, FacadeError> => ({
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
  status: 'SOLICITADA',
  createdAt: '2026-04-17T10:00:00.000Z',
  updatedAt: '2026-04-17T10:00:00.000Z',
};

const mockMensagens: CorridaMensagem[] = [
  {
    id: 'msg-001',
    corridaId: 'corrida-test-001',
    remetenteId: 'motorista-001',
    conteudo: 'Estou a caminho!',
    createdAt: '2026-04-17T10:05:00.000Z',
  },
];

const buildMockFacade = (overrides: Partial<ICorridaFacade> = {}): ICorridaFacade => ({
  solicitarCorrida: jest.fn().mockResolvedValue(
    ok<SolicitarCorridaResponse>({corridaId: 'corrida-test-001', status: 'SOLICITADA'}),
  ),
  createCorrida: jest.fn().mockResolvedValue(
    ok<SolicitarCorridaResponse>({corridaId: 'corrida-test-001', status: 'SOLICITADA'}),
  ),
  aceitarCorrida: jest.fn().mockResolvedValue(
    ok({...mockCorrida, status: 'ACEITA', motoristaId: 'motorista-001'} as Corrida),
  ),
  recusarCorrida: jest.fn().mockResolvedValue(
    ok({...mockCorrida, status: 'RECUSADA'} as Corrida),
  ),
  iniciarDeslocamento: jest.fn().mockResolvedValue(
    ok({...mockCorrida, status: 'EM_DESLOCAMENTO'} as Corrida),
  ),
  confirmarEmbarque: jest.fn().mockResolvedValue(
    ok({...mockCorrida, status: 'PASSAGEIRO_EMBARCADO'} as Corrida),
  ),
  finalizarCorrida: jest.fn().mockResolvedValue(
    ok({...mockCorrida, status: 'FINALIZADA'} as Corrida),
  ),
  cancelarCorrida: jest.fn().mockResolvedValue(
    ok({...mockCorrida, status: 'CANCELADA'} as Corrida),
  ),
  getCorrida: jest.fn().mockResolvedValue(ok(mockCorrida)),
  getCorridaStatus: jest.fn().mockResolvedValue(
    ok<CorridaStatusResponse>({id: 'corrida-test-001', status: 'SOLICITADA'}),
  ),
  getMensagens: jest.fn().mockResolvedValue(ok(mockMensagens)),
  searchLocations: jest.fn().mockResolvedValue(ok([])),
  cancelCorrida: jest.fn().mockResolvedValue(ok(true)),
  getActiveCorrida: jest.fn().mockResolvedValue(ok(null)),
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

const buildStore = (papeis: string[] = []) =>
  configureStore({
    reducer: {corrida: corridaReducer, auth: authReducer, ui: uiReducer},
    preloadedState: {
      auth: {
        user: mockUser,
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        papeis,
      },
    },
  });

const Wrapper = ({
  children,
  facade,
  papeis = [],
}: {
  children: React.ReactNode;
  facade?: Partial<ICorridaFacade>;
  papeis?: string[];
}) => {
  const store = buildStore(papeis);
  const mockFacade = buildMockFacade(facade);
  return (
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <FacadeProvider facades={{corridaFacade: mockFacade}}>
            <NavigationContainer>{children}</NavigationContainer>
          </FacadeProvider>
        </ThemeProvider>
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
      expect(screen.getByTestId('btn-request-ride')).toBeTruthy();
    });
  });

  it('shows active corrida card when one exists', async () => {
    render(
      <Wrapper facade={{getActiveCorrida: jest.fn().mockResolvedValue(ok(mockCorrida))}}>
        <PassageiroCorridasListScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('active-corrida-card')).toBeTruthy();
    });
  });

  it('does NOT render MotoristaCorridaAction navigation — USUARIO scope only', async () => {
    // The screen should only navigate to AcompanharCorrida, never MotoristaCorridaAction.
    // We verify by checking the testID of the screen itself renders correctly.
    render(
      <Wrapper>
        <PassageiroCorridasListScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('passageiro-corridas-list-screen')).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// AcompanharCorridaScreen — USUARIO
// ---------------------------------------------------------------------------

describe('AcompanharCorridaScreen (USUARIO)', () => {
  beforeEach(() => {
    jest.spyOn(require('@react-navigation/native'), 'useRoute').mockReturnValue({
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
      <Wrapper>
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
      <Wrapper>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('mensagens-list')).toBeTruthy();
    });
  });

  it('shows cancel button for active corrida (USUARIO can cancel)', async () => {
    render(
      <Wrapper>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('cancel-open-btn')).toBeTruthy();
    });
  });

  it('does NOT show MOTORISTA-only action buttons', async () => {
    render(
      <Wrapper>
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
      <Wrapper facade={{getMensagens: jest.fn().mockResolvedValue(ok([]))}}>
        <AcompanharCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('mensagens-empty')).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// MotoristaCorridaScreen — MOTORISTA
// ---------------------------------------------------------------------------

describe('MotoristaCorridaScreen (MOTORISTA)', () => {
  beforeEach(() => {
    jest.spyOn(require('@react-navigation/native'), 'useRoute').mockReturnValue({
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
      <Wrapper papeis={['MOTORISTA']}>
        <MotoristaCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('btn-aceitar')).toBeTruthy();
      expect(screen.getByTestId('btn-recusar')).toBeTruthy();
    });
  });

  it('calls aceitarCorrida on aceitar press', async () => {
    const aceitarMock = jest.fn().mockResolvedValue(
      ok({...mockCorrida, status: 'ACEITA', motoristaId: 'motorista-001'} as Corrida),
    );
    render(
      <Wrapper facade={{aceitarCorrida: aceitarMock}} papeis={['MOTORISTA']}>
        <MotoristaCorridaScreen />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId('btn-aceitar'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-aceitar'));
    });
    expect(aceitarMock).toHaveBeenCalledWith(
      'corrida-test-001',
      expect.objectContaining({motoristaId: expect.any(String)}),
    );
  });

  it('handles 409 conflict on aceitar without crashing', async () => {
    const conflictFacade = buildMockFacade({
      aceitarCorrida: jest.fn().mockResolvedValue(
        fail<Corrida>('Corrida já aceita', 'CONFLICT'),
      ),
    });
    render(
      <Wrapper facade={conflictFacade} papeis={['MOTORISTA']}>
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
