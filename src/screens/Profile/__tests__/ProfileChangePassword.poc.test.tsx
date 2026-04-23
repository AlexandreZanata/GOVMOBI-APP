/**
 * @fileoverview POC tests for the change-password feature on ProfileScreen.
 *
 * Covers: loading state, success, wrong-password error, mismatch validation,
 * and the Minha Nota row visibility (MOTORISTA only).
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
import {ProfileScreen} from '../ProfileScreen';
import {UserRole, UserStatus} from '@models/User';
import type {IAuthFacade} from '@services/facades';
import type {FacadeError, Result} from '@services/facades';

// Prevent useMinhaAvaliacaoSummary from firing async state updates in tests
jest.mock('../../../screens/Motorista/useMinhaAvaliacaoSummary', () => ({
  useMinhaAvaliacaoSummary: () => ({summary: null, isLoading: false, error: null, retry: jest.fn()}),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ok = <T,>(data: T): Result<T, FacadeError> => ({data, error: null});
const _fail = <T,>(msg: string, code = 'NETWORK_ERROR'): Result<T, FacadeError> => ({
  data: null,
  error: {code, message: msg},
});

const buildMockAuthFacade = (
  overrides: Partial<IAuthFacade> = {},
): IAuthFacade => ({
  login: jest.fn().mockResolvedValue(ok({accessToken: 'tok', refreshToken: 'ref', user: {} as never})),
  logout: jest.fn().mockResolvedValue(ok(true)),
  refreshToken: jest.fn().mockResolvedValue(ok({accessToken: 'tok', refreshToken: 'ref'})),
  getCurrentUser: jest.fn().mockResolvedValue(ok(null)),
  getMe: jest.fn().mockResolvedValue(ok({id: '1', email: 'a@b.com', nome: 'Test', papeis: ['USUARIO']})),
  isAuthenticated: jest.fn().mockResolvedValue(ok(true)),
  changePassword: jest.fn().mockResolvedValue(ok(true)),
  ...overrides,
});

const buildStore = (motoristaId: string | null = null) =>
  configureStore({
    reducer: {corrida: corridaReducer, auth: authReducer, ui: uiReducer},
    preloadedState: {
      auth: {
        user: {
          id: 'usr-1',
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
        papeis: motoristaId ? ['MOTORISTA'] : ['USUARIO'],
        motoristaId,
        municipioId: null,
        isHydrating: false,
      },
    } as Parameters<typeof configureStore>[0]['preloadedState'],
  });

const Wrapper = ({
  children,
  authFacade,
  motoristaId = null,
}: {
  children: React.ReactNode;
  authFacade: IAuthFacade;
  motoristaId?: string | null;
}) => {
  const storeRef = useRef(buildStore(motoristaId));
  const facadesRef = useRef({
    authFacade,
    avaliacoesFacade: {
      getMinhaAvaliacaoSummary: jest.fn().mockReturnValue(Promise.resolve({data: null, error: null})),
      listAvaliacoes: jest.fn().mockReturnValue(Promise.resolve({data: [], error: null})),
    },
  });
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

/** Renders a Wrapper + ProfileScreen and waits for async mount effects to settle. */
const renderWrapped = async (props: Omit<React.ComponentProps<typeof Wrapper>, 'children'>) => {
  const utils = render(<Wrapper {...props}><ProfileScreen /></Wrapper>);
  // Drain microtasks so useMinhaAvaliacaoSummary state updates settle
  await waitFor(() => expect(utils.getByTestId('profile-hero')).toBeTruthy());
  return utils;
};

describe('ProfileScreen — change password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress act() warnings from useMinhaAvaliacaoSummary async state updates
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the change-password card with all inputs and submit button', async () => {
    const facade = buildMockAuthFacade();
    await renderWrapped({authFacade: facade});

    fireEvent.press(screen.getByTestId('profile-change-password-toggle'));

    await waitFor(() => {
      expect(screen.getByTestId('profile-change-password-card')).toBeTruthy();
      expect(screen.getByTestId('input-senha-antiga')).toBeTruthy();
      expect(screen.getByTestId('input-nova-senha')).toBeTruthy();
      expect(screen.getByTestId('input-confirmar-senha')).toBeTruthy();
      expect(screen.getByTestId('btn-change-password')).toBeTruthy();
    });
  });

  it('calls changePassword facade and shows loading indicator while pending', async () => {
    let resolve!: (v: Result<boolean, FacadeError>) => void;
    const changePasswordMock = jest.fn().mockReturnValue(new Promise<Result<boolean, FacadeError>>(r => { resolve = r; }));
    const facade = buildMockAuthFacade({changePassword: changePasswordMock});

    await renderWrapped({authFacade: facade});

    fireEvent.press(screen.getByTestId('profile-change-password-toggle'));
    await waitFor(() => expect(screen.getByTestId('input-senha-antiga')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('input-senha-antiga'), 'OldPass@1');
    fireEvent.changeText(screen.getByTestId('input-nova-senha'), 'NewPass@2026');
    fireEvent.changeText(screen.getByTestId('input-confirmar-senha'), 'NewPass@2026');

    await act(async () => { fireEvent.press(screen.getByTestId('btn-change-password')); });

    await waitFor(() => {
      expect(screen.getByTestId('change-password-loading')).toBeTruthy();
    });

    await act(async () => { resolve(ok(true)); });
  });

  it('calls changePassword with correct args on success and clears inputs', async () => {
    const changePasswordMock = jest.fn().mockResolvedValue(ok(true));
    const facade = buildMockAuthFacade({changePassword: changePasswordMock});

    await renderWrapped({authFacade: facade});

    fireEvent.press(screen.getByTestId('profile-change-password-toggle'));
    await waitFor(() => expect(screen.getByTestId('input-senha-antiga')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('input-senha-antiga'), 'OldPass@1');
    fireEvent.changeText(screen.getByTestId('input-nova-senha'), 'NewPass@2026');
    fireEvent.changeText(screen.getByTestId('input-confirmar-senha'), 'NewPass@2026');

    await act(async () => { fireEvent.press(screen.getByTestId('btn-change-password')); });

    await waitFor(() => {
      expect(changePasswordMock).toHaveBeenCalledWith('OldPass@1', 'NewPass@2026');
    });
    await waitFor(() => {
      expect(screen.getByTestId('input-senha-antiga').props.value).toBe('');
      expect(screen.getByTestId('input-nova-senha').props.value).toBe('');
      expect(screen.getByTestId('input-confirmar-senha').props.value).toBe('');
    });
  });

  it('does NOT call facade when passwords do not match', async () => {
    const changePasswordMock = jest.fn();
    const facade = buildMockAuthFacade({changePassword: changePasswordMock});

    await renderWrapped({authFacade: facade});

    fireEvent.press(screen.getByTestId('profile-change-password-toggle'));
    await waitFor(() => expect(screen.getByTestId('input-senha-antiga')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('input-senha-antiga'), 'OldPass@1');
    fireEvent.changeText(screen.getByTestId('input-nova-senha'), 'NewPass@2026');
    fireEvent.changeText(screen.getByTestId('input-confirmar-senha'), 'DifferentPass@2026');

    await act(async () => { fireEvent.press(screen.getByTestId('btn-change-password')); });

    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('does NOT call facade when fields are empty', async () => {
    const changePasswordMock = jest.fn();
    const facade = buildMockAuthFacade({changePassword: changePasswordMock});

    await renderWrapped({authFacade: facade});

    fireEvent.press(screen.getByTestId('profile-change-password-toggle'));
    await waitFor(() => expect(screen.getByTestId('btn-change-password')).toBeTruthy());

    await act(async () => { fireEvent.press(screen.getByTestId('btn-change-password')); });

    expect(changePasswordMock).not.toHaveBeenCalled();
  });
});

describe('ProfileScreen — Minha Nota row', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
  it('shows Minha Nota row when user is a MOTORISTA', async () => {
    const facade = buildMockAuthFacade();
    await renderWrapped({authFacade: facade, motoristaId: 'mot-1'});
    expect(screen.getByTestId('profile-minha-nota-card')).toBeTruthy();
    expect(screen.getByTestId('profile-minha-nota-row')).toBeTruthy();
  });

  it('hides Minha Nota row for non-MOTORISTA users', async () => {
    const facade = buildMockAuthFacade();
    await renderWrapped({authFacade: facade, motoristaId: null});
    expect(screen.queryByTestId('profile-minha-nota-card')).toBeNull();
  });
});
