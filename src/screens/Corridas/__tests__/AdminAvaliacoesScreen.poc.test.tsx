/**
 * @fileoverview POC tests for AdminAvaliacoesScreen.
 *
 * Covers: loading state, error state with retry, successful list render.
 *
 * Validates: Requirements 9.1
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
import authReducer from '../../../store/slices/authSlice';
import uiReducer from '../../../store/slices/uiSlice';
import {AdminAvaliacoesScreen} from '../AdminAvaliacoesScreen';
import {UserRole, UserStatus} from '@models/User';
import type {IAvaliacoesFacade} from '@services/facades';
import type {FacadeError, Result} from '@services/facades';
import type {Avaliacao} from '@models/Avaliacao';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FIXTURE_AVALIACOES: Avaliacao[] = [
  {
    id: 'avl-1',
    corridaId: 'cor-101',
    passageiroId: 'pas-1',
    motoristaId: 'mot-1',
    nota: 5,
    comentario: 'Excelente motorista!',
    createdAt: '2026-04-10T08:30:00.000Z',
  },
  {
    id: 'avl-2',
    corridaId: 'cor-102',
    passageiroId: 'pas-2',
    motoristaId: 'mot-1',
    nota: 4,
    comentario: 'Boa viagem.',
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ok = <T,>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T,>(msg: string, code = 'NETWORK_ERROR'): Result<T, FacadeError> => ({
  data: null,
  error: {code, message: msg},
});

const buildMockAvaliacoesFacade = (
  overrides: Partial<IAvaliacoesFacade> = {},
): IAvaliacoesFacade => ({
  listAvaliacoes: jest.fn().mockResolvedValue(ok(FIXTURE_AVALIACOES)),
  getMinhaAvaliacaoSummary: jest.fn().mockResolvedValue(ok({motoristaId: 'mot-1', mediaNotas: 4.5, totalAvaliacoes: 2})),
  ...overrides,
});

const buildStore = () =>
  configureStore({
    reducer: {corrida: corridaReducer, auth: authReducer, ui: uiReducer},
    preloadedState: {
      auth: {
        user: {
          id: 'user-001',
          fullName: 'Admin User',
          email: 'admin@gov.br',
          role: UserRole.OFFICER,
          status: UserStatus.ACTIVE,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        papeis: ['ADMIN'],
        motoristaId: null,
        municipioId: null,
        isHydrating: false,
      },
    } as Parameters<typeof configureStore>[0]['preloadedState'],
  });

const Wrapper = ({
  children,
  avaliacoesFacade,
}: {
  children: React.ReactNode;
  avaliacoesFacade: IAvaliacoesFacade;
}) => {
  const storeRef = useRef(buildStore());
  const facadesRef = useRef({avaliacoesFacade});
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

describe('AdminAvaliacoesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders ActivityIndicator (loading-indicator) while listAvaliacoes is pending', async () => {
    const facade = buildMockAvaliacoesFacade({
      listAvaliacoes: jest.fn().mockReturnValue(new Promise(() => {})), // never resolves
    });

    render(
      <Wrapper avaliacoesFacade={facade}>
        <AdminAvaliacoesScreen />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    });
  });

  it('renders error-state and retry-button when listAvaliacoes returns an error; pressing retry calls the facade again', async () => {
    const listMock = jest.fn().mockResolvedValue(
      fail('fail', 'NETWORK_ERROR'),
    );
    const facade = buildMockAvaliacoesFacade({listAvaliacoes: listMock});

    render(
      <Wrapper avaliacoesFacade={facade}>
        <AdminAvaliacoesScreen />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeTruthy();
      expect(screen.getByTestId('retry-button')).toBeTruthy();
    });

    expect(listMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(screen.getByTestId('retry-button'));
    });

    await waitFor(() => {
      expect(listMock).toHaveBeenCalledTimes(2);
    });
  });

  it('renders avaliacoes-list with 3 items when listAvaliacoes returns fixtures', async () => {
    const facade = buildMockAvaliacoesFacade({
      listAvaliacoes: jest.fn().mockResolvedValue(ok(FIXTURE_AVALIACOES)),
    });

    render(
      <Wrapper avaliacoesFacade={facade}>
        <AdminAvaliacoesScreen />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('avaliacoes-list')).toBeTruthy();
    });

    // Each card is rendered with testID avaliacao-card-{id}
    for (const avaliacao of FIXTURE_AVALIACOES) {
      expect(screen.getByTestId(`avaliacao-card-${avaliacao.id}`)).toBeTruthy();
    }
  });
});
