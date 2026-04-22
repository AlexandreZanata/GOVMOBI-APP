/**
 * @fileoverview POC tests for PassageiroScreen.
 * Covers: loading state, map render, search overlay, result selection, CTA.
 */
import React from 'react';
import {render, fireEvent, waitFor, act} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {I18nextProvider} from 'react-i18next';
import {i18n} from '../../../i18n';
import {ThemeProvider} from '@theme/index';
import {FacadeProvider} from '@services/facades';
import {PassageiroScreen} from '../PassageiroScreen';
import corridaReducer from '../../../store/slices/corridaSlice';
import authReducer from '../../../store/slices/authSlice';
import realtimeReducer from '../../../store/slices/realtimeSlice';
import uiReducer from '../../../store/slices/uiSlice';
import locationReducer from '../../../store/slices/locationSlice';
import type {ICorridaFacade} from '@services/facades';
import type {IPesquisaFacade} from '@services/facades';
import type {IRealtimeFacade} from '@services/facades';
import type {FacadeError, Result} from '@services/facades';
import type {SearchResult} from '../../../types';
import type {
  GeocodingResult,
  PesquisaRouteResult,
} from '../../../types/pesquisa';
import {UserRole, UserStatus} from '@models/User';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@expo/vector-icons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockReact = require('react') as typeof import('react');
  const MockIcon = ({testID}: {testID?: string}) =>
    mockReact.createElement('View', {testID});
  return {
    MaterialIcons: MockIcon,
    Ionicons: MockIcon,
    FontAwesome: MockIcon,
  };
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest
    .fn()
    .mockResolvedValue({status: 'granted'}),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: {latitude: -15.7801, longitude: -47.9292},
  }),
  Accuracy: {Balanced: 3},
}));

jest.mock('@rnmapbox/maps', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockReact = require('react') as typeof import('react');
  const MockMapView = ({
    children,
    testID,
  }: {
    children?: unknown;
    testID?: string;
  }) =>
    mockReact.createElement(
      'View',
      {testID: testID ?? 'mapbox-map'},
      children as React.ReactNode,
    );
  const MockCamera = () => null;
  const MockPointAnnotation = ({children}: {children?: unknown}) =>
    mockReact.createElement(
      'View',
      {testID: 'point-annotation'},
      children as React.ReactNode,
    );
  return {
    default: {setAccessToken: jest.fn()},
    MapView: MockMapView,
    Camera: MockCamera,
    PointAnnotation: MockPointAnnotation,
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockSearchResults: SearchResult[] = [
  {
    id: 'place.1',
    placeName: 'Prefeitura Municipal de Sorriso',
    address:
      'Prefeitura Municipal de Sorriso - Avenida Porto Alegre - Centro, Sorriso - MT, Brasil',
    coordinates: {latitude: -12.5444, longitude: -55.7208},
  },
  {
    id: 'place.2',
    placeName: 'Secretaria Municipal de Educação',
    address:
      'Secretaria Municipal de Educação - Avenida Tancredo Neves - Centro Sul, Sorriso - MT, Brasil',
    coordinates: {latitude: -12.55, longitude: -55.725},
  },
];

const createMockCorridaFacade = (
  overrides: Partial<ICorridaFacade> = {},
): ICorridaFacade =>
  ({
    solicitarCorrida: jest.fn().mockResolvedValue({
      data: {corridaId: 'corrida-1', status: 'SOLICITADA'},
      error: null,
    } as Result<unknown, FacadeError>),
    createCorrida: jest.fn().mockResolvedValue({
      data: {corridaId: 'corrida-1', status: 'SOLICITADA'},
      error: null,
    } as Result<unknown, FacadeError>),
    cancelCorrida: jest.fn().mockResolvedValue({data: true, error: null}),
    getActiveCorrida: jest.fn().mockResolvedValue({data: null, error: null}),
    searchLocations: jest.fn().mockResolvedValue({
      data: mockSearchResults,
      error: null,
    } as Result<SearchResult[], FacadeError>),
    ...overrides,
  }) as unknown as ICorridaFacade;

const createMockPesquisaFacade = (
  overrides: Partial<IPesquisaFacade> = {},
): IPesquisaFacade =>
  ({
    getPesquisaConfig: jest.fn().mockResolvedValue({
      data: {mapboxPublicToken: 'pk.test.token'},
      error: null,
    }),
    geocodeAddress: jest.fn().mockResolvedValue({
      data: [
        {
          address: mockSearchResults[0].address,
          placeName: mockSearchResults[0].placeName,
          lat: mockSearchResults[0].coordinates.latitude,
          lng: mockSearchResults[0].coordinates.longitude,
        },
      ],
      error: null,
    } as Result<GeocodingResult[], FacadeError>),
    reverseGeocode: jest.fn().mockResolvedValue({
      data: {
        address: mockSearchResults[0].address,
        lat: mockSearchResults[0].coordinates.latitude,
        lng: mockSearchResults[0].coordinates.longitude,
      },
      error: null,
    }),
    getRouteBetweenPoints: jest.fn().mockResolvedValue({
      data: {
        geometry: {
          type: 'LineString',
          coordinates: [
            [
              mockSearchResults[0].coordinates.longitude,
              mockSearchResults[0].coordinates.latitude,
            ],
            [
              mockSearchResults[1].coordinates.longitude,
              mockSearchResults[1].coordinates.latitude,
            ],
          ],
        },
        distanciaMetros: 1800,
        duracaoSegundos: 540,
      },
      error: null,
    } as Result<PesquisaRouteResult, FacadeError>),
    ...overrides,
  }) as unknown as IPesquisaFacade;

const createMockRealtimeFacade = (): IRealtimeFacade =>
  ({
    connect: jest.fn().mockResolvedValue({data: true, error: null}),
    disconnect: jest.fn().mockResolvedValue({data: true, error: null}),
    onConnectionStatusChange: jest.fn(() => () => undefined),
    subscribeToCorrida: jest.fn().mockResolvedValue({data: true, error: null}),
    unsubscribeFromCorrida: jest
      .fn()
      .mockResolvedValue({data: true, error: null}),
    onEvent: jest.fn(() => () => undefined),
    mapCorridaStatus: jest.fn(() => null),
  }) as unknown as IRealtimeFacade;

const buildStore = () =>
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
          id: 'passageiro-001',
          fullName: 'Ana Passageira',
          email: 'ana.passageira@govmobile.gov',
          role: UserRole.CITIZEN,
          status: UserStatus.ACTIVE,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
        papeis: ['USUARIO'],
        motoristaId: null,
        municipioId: null,
        isHydrating: false,
        statusOperacional: null,
        servidorId: null,
      },
    },
  });

const renderScreen = (
  corridaFacade: ICorridaFacade = createMockCorridaFacade(),
  pesquisaFacade: IPesquisaFacade = createMockPesquisaFacade(),
) => {
  const store = buildStore();
  return render(
    <SafeAreaProvider>
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider mode="light">
            <FacadeProvider
              facades={{
                corridaFacade,
                pesquisaFacade,
                realtimeFacade: createMockRealtimeFacade(),
              }}>
              <NavigationContainer>
                <PassageiroScreen />
              </NavigationContainer>
            </FacadeProvider>
          </ThemeProvider>
        </I18nextProvider>
      </Provider>
    </SafeAreaProvider>,
  );
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PassageiroScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the screen with map, search bar, and bottom sheet', async () => {
    const {getByTestId} = renderScreen();

    await waitFor(() => {
      expect(getByTestId('passageiro-screen')).toBeTruthy();
    });

    expect(getByTestId('search-bar-input')).toBeTruthy();
    expect(getByTestId('bottom-sheet')).toBeTruthy();
    expect(getByTestId('cta-solicitar')).toBeTruthy();
  });

  it('shows the default destination placeholder text', async () => {
    const {getByTestId} = renderScreen();

    await waitFor(() => {
      expect(getByTestId('destino-value')).toBeTruthy();
    });

    expect(getByTestId('destino-value').props.children).toBe(
      i18n.t('passageiro.bottomSheet.destinoPlaceholder'),
    );
  });

  it('opens search overlay when search bar is focused', async () => {
    const {getByTestId} = renderScreen();

    await act(async () => {
      fireEvent(getByTestId('search-bar-input'), 'focus');
    });

    expect(getByTestId('search-overlay')).toBeTruthy();
  });

  it('calls geocodeAddress and shows results when user types', async () => {
    const facade = createMockCorridaFacade();
    const pesquisaFacade = createMockPesquisaFacade();
    const {getByTestId, findByTestId} = renderScreen(facade, pesquisaFacade);

    await act(async () => {
      fireEvent(getByTestId('search-bar-input'), 'focus');
      fireEvent.changeText(getByTestId('search-bar-input'), 'Prefeitura');
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    await waitFor(() => {
      expect(pesquisaFacade.geocodeAddress).toHaveBeenCalledWith(
        expect.objectContaining({query: 'Prefeitura'}),
      );
    });

    const resultsList = await findByTestId('search-results-list');
    expect(resultsList).toBeTruthy();
  });

  it('selects a destination and updates the bottom sheet', async () => {
    const facade = createMockCorridaFacade();
    const pesquisaFacade = createMockPesquisaFacade();
    const {getByTestId, findByTestId} = renderScreen(facade, pesquisaFacade);

    await act(async () => {
      fireEvent(getByTestId('search-bar-input'), 'focus');
      fireEvent.changeText(getByTestId('search-bar-input'), 'Prefeitura');
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    await waitFor(() => {
      expect(pesquisaFacade.geocodeAddress).toHaveBeenCalled();
    });

    const firstResult = await findByTestId(
      `search-result-${mockSearchResults[0].coordinates.latitude}-${mockSearchResults[0].coordinates.longitude}-0`,
    );
    await act(async () => {
      fireEvent.press(firstResult);
    });

    await waitFor(() => {
      expect(getByTestId('destino-value').props.children).toBe(
        mockSearchResults[0].placeName,
      );
    });
  });

  it('calls solicitarCorrida when CTA flow is completed', async () => {
    const facade = createMockCorridaFacade();
    const pesquisaFacade = createMockPesquisaFacade();
    const {getByTestId, findByTestId} = renderScreen(facade, pesquisaFacade);

    // Select a destination first
    await act(async () => {
      fireEvent(getByTestId('search-bar-input'), 'focus');
      fireEvent.changeText(getByTestId('search-bar-input'), 'Prefeitura');
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    await waitFor(() => {
      expect(pesquisaFacade.geocodeAddress).toHaveBeenCalled();
    });

    const firstResult = await findByTestId(
      `search-result-${mockSearchResults[0].coordinates.latitude}-${mockSearchResults[0].coordinates.longitude}-0`,
    );
    await act(async () => {
      fireEvent.press(firstResult);
    });

    await act(async () => {
      fireEvent.press(getByTestId('cta-solicitar'));
    });

    await waitFor(() => {
      expect(getByTestId('solicitar-modal')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(getByTestId('motivo-input'), 'Inspecao de campo');
    });

    await waitFor(() => {
      expect(getByTestId('motivo-input').props.value).toBe('Inspecao de campo');
    });

    await act(async () => {
      fireEvent.press(getByTestId('btn-solicitar-modal'));
    });

    await waitFor(() => {
      expect(facade.solicitarCorrida).toHaveBeenCalled();
    });
  });

  it('shows error state when searchLocations fails', async () => {
    const facade = createMockCorridaFacade({
      searchLocations: jest.fn().mockResolvedValue({
        data: null,
        error: {code: 'NETWORK_ERROR', message: 'Network error'},
      }),
    });

    const pesquisaFacade = createMockPesquisaFacade({
      geocodeAddress: jest.fn().mockResolvedValue({
        data: null,
        error: {code: 'NETWORK_ERROR', message: 'Network error'},
      }),
    });

    const {getByTestId, findByTestId} = renderScreen(facade, pesquisaFacade);

    await act(async () => {
      fireEvent(getByTestId('search-bar-input'), 'focus');
      fireEvent.changeText(getByTestId('search-bar-input'), 'Prefeitura');
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    await waitFor(() => {
      expect(pesquisaFacade.geocodeAddress).toHaveBeenCalled();
    });

    const empty = await findByTestId('search-empty');
    expect(empty).toBeTruthy();
  });
});
