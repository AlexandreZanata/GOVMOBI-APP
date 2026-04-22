/**
 * @fileoverview POC tests for MinhaNotaScreen.
 *
 * Covers: loading state, error state with retry, successful summary render.
 *
 * Validates: Requirements 9.2
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
import {MinhaNotaScreen} from '../MinhaNotaScreen';
import {UserRole, UserStatus} from '@models/User';
import type {IAvaliacoesFacade} from '@services/facades';
import type {FacadeError, Result} from '@services/facades';
import type {AvaliacaoSummary} from '@models/Avaliacao';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ok = <T,>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T,>(msg: string, code = 'NETWORK_ERROR'): Result<T, FacadeError> => ({
  data: null,
  error: {code, message: msg},
});

const FIXTURE_SUMMARY: AvaliacaoSummary = {
  motoristaId: 'mot-1',
  mediaNotas: 4.5,
  totalAvaliacoes: 10,
};

const buildMockAvaliacoesFacade = (
  overrides: Partial<IAvaliacoesFacade> = {},
): IAvaliacoesFacade => ({
  listAvaliacoes: jest.fn().mockResolvedValue(ok([])),
  getMinhaAvaliacaoSummary: jest.fn().mockResolvedValue(ok(FIXTURE_SUMMARY)),
  ...overrides,
});

const buildStore = () =>
  configureStore({
    reducer: {corrida: corridaReducer, auth: authReducer, ui: uiReducer},
    preloadedState: {
      auth: {
        user: {
          id: 'mot-001',
          fullName: 'Motorista User',
          email: 'motorista@gov.br',
          role: UserRole.OFFICER,
          status: UserStatus.ACTIVE,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        papeis: ['MOTORISTA'],
        motoristaId: 'mot-001',
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

describe('MinhaNotaScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders ActivityIndicator (loading-indicator) while getMinhaAvaliacaoSummary is pending', async () => {
    const facade = buildMockAvaliacoesFacade({
      getMinhaAvaliacaoSummary: jest.fn().mockReturnValue(new Promise(() => {})), // never resolves
    });

    render(
      <Wrapper avaliacoesFacade={facade}>
        <MinhaNotaScreen />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    });
  });

  it('renders error-state and retry-button when facade returns an error; pressing retry calls the facade again', async () => {
    const summaryMock = jest.fn().mockResolvedValue(
      fail('fail', 'NETWORK_ERROR'),
    );
    const facade = buildMockAvaliacoesFacade({getMinhaAvaliacaoSummary: summaryMock});

    render(
      <Wrapper avaliacoesFacade={facade}>
        <MinhaNotaScreen />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeTruthy();
      expect(screen.getByTestId('retry-button')).toBeTruthy();
    });

    expect(summaryMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(screen.getByTestId('retry-button'));
    });

    await waitFor(() => {
      expect(summaryMock).toHaveBeenCalledTimes(2);
    });
  });

  it('renders media-notas (1 decimal) and total-avaliacoes on success', async () => {
    const facade = buildMockAvaliacoesFacade({
      getMinhaAvaliacaoSummary: jest.fn().mockResolvedValue(ok(FIXTURE_SUMMARY)),
    });

    render(
      <Wrapper avaliacoesFacade={facade}>
        <MinhaNotaScreen />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('media-notas')).toBeTruthy();
      expect(screen.getByTestId('total-avaliacoes')).toBeTruthy();
    });

    expect(screen.getByTestId('media-notas').props.children).toBe(
      FIXTURE_SUMMARY.mediaNotas.toFixed(1),
    );
    expect(screen.getByTestId('total-avaliacoes').props.children).toBe(
      FIXTURE_SUMMARY.totalAvaliacoes,
    );
  });
});
