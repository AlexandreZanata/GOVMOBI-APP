/**
 * @fileoverview POC test — CorridaMensagensScreen read receipts + notification gate.
 *
 * Covers:
 *  1. Loading state
 *  2. Empty state
 *  3. Own message shows single tick (lida=false)
 *  4. Own message shows double grey tick (lida=true, not viewed)
 *  5. Own message shows double blue tick (visualizadaEm set)
 *  6. Other party's message has no tick
 *  7. visualizarMensagens called on mount (REST + WS)
 *  8. setChatScreenOpen(true) dispatched on mount → badge zeroed
 *  9. setChatScreenOpen(false) dispatched on unmount → badge resumes
 * 10. Send message flow
 */
import React from 'react';
import {render, fireEvent, act, waitFor} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import corridaReducer from '@store/slices/corridaSlice';
import authReducer from '@store/slices/authSlice';
import realtimeReducer from '@store/slices/realtimeSlice';
import uiReducer from '@store/slices/uiSlice';
import {FacadeProvider} from '@services/facades';
import {CorridaMensagensScreen} from '../CorridaMensagensScreen';
import type {CorridaMensagem} from '@models/Corrida';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({params: {corridaId: 'corrida-test-001'}}),
  useNavigation: () => ({goBack: jest.fn(), setOptions: jest.fn()}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({bottom: 0, top: 0, left: 0, right: 0}),
}));

const mockVisualizarMensagensRest = jest.fn().mockResolvedValue({data: undefined, error: null});
const mockVisualizarMensagensWS = jest.fn().mockResolvedValue({data: true, error: null});
const mockContarNaoVisualizadas = jest.fn().mockResolvedValue({data: true, error: null});
const mockSendCorridaMessage = jest.fn().mockResolvedValue({data: true, error: null});
const mockGetMensagens = jest.fn().mockResolvedValue({data: [], error: null});

const mockFacades = {
  corridaFacade: {
    visualizarMensagens: mockVisualizarMensagensRest,
    getMensagens: mockGetMensagens,
  },
  realtimeFacade: {
    visualizarMensagens: mockVisualizarMensagensWS,
    contarNaoVisualizadas: mockContarNaoVisualizadas,
    sendCorridaMessage: mockSendCorridaMessage,
    onEvent: jest.fn(() => jest.fn()),
    onConnectionStatusChange: jest.fn(() => jest.fn()),
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CURRENT_USER = 'user-me-001';
const OTHER_USER = 'user-other-002';

const makeMsg = (overrides: Partial<CorridaMensagem> & {id: string}): CorridaMensagem => ({
  corridaId: 'corrida-test-001',
  remetenteId: CURRENT_USER,
  conteudo: 'Olá!',
  lida: false,
  visualizadaEm: null,
  visualizadaPor: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const buildStore = (mensagens: CorridaMensagem[] = [], loading = false) => {
  // Make getMensagens return the same messages so the screen doesn't overwrite preloaded state
  mockGetMensagens.mockResolvedValue({data: mensagens, error: null});

  return configureStore({
    reducer: {
      corrida: corridaReducer,
      auth: authReducer,
      realtime: realtimeReducer,
      ui: uiReducer,
    },
    preloadedState: {
      corrida: {
        mensagens,
        isLoadingMensagens: loading,
        activeCorrida: null,
        pendingCorridaId: null,
        selectedDestino: null,
        userLocationSnapshot: null,
        isRequesting: false,
        isActionLoading: false,
        error: null,
        searchResults: [],
        isSearching: false,
        posicaoMotoristaAtual: null,
        corridaHistory: [],
        ratingSubmitted: false,
        driverPosition: null,
        unreadMensagens: 3,
        naoVisualizadasCount: 3,
        isChatScreenOpen: false,
        posicaoFila: null,
        motoristaNomeCache: null,
      },
      auth: {
        isAuthenticated: true,
        token: 'tok',
        servidorId: CURRENT_USER,
        user: {id: CURRENT_USER, name: 'Me', email: 'me@gov.br', role: 'USUARIO'} as never,
        motoristaId: null,
        papeis: ['USUARIO'],
        refreshToken: null,
        permissionStatus: 'granted',
        isLoading: false,
        error: null,
        municipioId: null,
        isHydrating: false,
        statusOperacional: null,
      } as never,
    },
  });
};

const renderScreen = (store = buildStore()) => {
  const utils = render(
    <Provider store={store}>
      <FacadeProvider facades={mockFacades as never}>
        <CorridaMensagensScreen />
      </FacadeProvider>
    </Provider>,
  );
  return {...utils, store};
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CorridaMensagensScreen — read receipts + notification gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. shows loading indicator', () => {
    const store = buildStore([], true);
    const {getByTestId} = renderScreen(store);
    expect(getByTestId('mensagens-loading')).toBeTruthy();
  });

  it('2. shows empty state when no messages', async () => {
    const {getByTestId} = renderScreen(buildStore([]));
    await waitFor(() => expect(getByTestId('mensagens-empty')).toBeTruthy());
  });

  it('3. own message with lida=false shows single tick (tick-sent)', async () => {
    const store = buildStore([makeMsg({id: 'm1', lida: false})]);
    const {getByTestId} = renderScreen(store);
    await waitFor(() => expect(getByTestId('tick-sent')).toBeTruthy());
  });

  it('4. own message with lida=true shows double grey tick (tick-read)', async () => {
    const store = buildStore([makeMsg({id: 'm2', lida: true, visualizadaEm: null})]);
    const {getByTestId} = renderScreen(store);
    await waitFor(() => expect(getByTestId('tick-read')).toBeTruthy());
  });

  it('5. own message with visualizadaEm shows double blue tick (tick-viewed)', async () => {
    const store = buildStore([
      makeMsg({id: 'm3', lida: true, visualizadaEm: new Date().toISOString()}),
    ]);
    const {getByTestId} = renderScreen(store);
    await waitFor(() => expect(getByTestId('tick-viewed')).toBeTruthy());
  });

  it("6. other party's message has no tick", async () => {
    const store = buildStore([
      makeMsg({id: 'm4', remetenteId: OTHER_USER, lida: true}),
    ]);
    const {queryByTestId} = renderScreen(store);
    await waitFor(() => expect(queryByTestId('tick-sent')).toBeNull());
    expect(queryByTestId('tick-read')).toBeNull();
    expect(queryByTestId('tick-viewed')).toBeNull();
  });

  it('7. calls visualizarMensagens via REST and WS on mount', async () => {
    renderScreen();
    await waitFor(() => {
      expect(mockVisualizarMensagensRest).toHaveBeenCalledWith('corrida-test-001');
      expect(mockVisualizarMensagensWS).toHaveBeenCalledWith({corridaId: 'corrida-test-001'});
    });
  });

  it('8. dispatches setChatScreenOpen(true) on mount — zeroes badge', async () => {
    const {store} = renderScreen();
    await waitFor(() => {
      const state = store.getState().corrida;
      expect(state.isChatScreenOpen).toBe(true);
      expect(state.naoVisualizadasCount).toBe(0);
      expect(state.unreadMensagens).toBe(0);
    });
  });

  it('9. dispatches setChatScreenOpen(false) on unmount — badge resumes', async () => {
    const {store, unmount} = renderScreen();
    await waitFor(() => expect(store.getState().corrida.isChatScreenOpen).toBe(true));
    act(() => unmount());
    expect(store.getState().corrida.isChatScreenOpen).toBe(false);
  });

  it('10. send button dispatches sendCorridaMessage', async () => {
    const {getByTestId} = renderScreen();
    const input = getByTestId('message-input');
    const btn = getByTestId('send-btn');

    fireEvent.changeText(input, 'Estou chegando!');
    await act(async () => {
      fireEvent.press(btn);
    });

    await waitFor(() => {
      expect(mockSendCorridaMessage).toHaveBeenCalledWith({
        corridaId: 'corrida-test-001',
        conteudo: 'Estou chegando!',
      });
    });
  });
});
