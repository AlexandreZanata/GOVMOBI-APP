/**
 * @fileoverview POC tests for PassageiroScreen.
 * Covers: loading state, map render, search overlay, result selection, CTA.
 */
import React from 'react';
import {render, fireEvent, waitFor, act} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {I18nextProvider} from 'react-i18next';
import {i18n} from '../../../i18n';
import {ThemeProvider} from '../../../theme';
import {FacadeProvider} from '../../../services/facades';
import {PassageiroScreen} from '../PassageiroScreen';
import corridaReducer from '../../../store/slices/corridaSlice';
import authReducer from '../../../store/slices/authSlice';
import uiReducer from '../../../store/slices/uiSlice';
import type {ICorridaFacade} from '../../../services/facades/CorridaFacade';
import type {FacadeError, Result} from '../../../services/facades/types';
import type {SearchResult} from '../../../types/corrida';

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

const buildStore = () =>
  configureStore({
    reducer: {
      corrida: corridaReducer,
      auth: authReducer,
      ui: uiReducer,
    },
  });

const renderScreen = (
  corridaFacade: ICorridaFacade = createMockCorridaFacade(),
) => {
  const store = buildStore();
  return render(
    <SafeAreaProvider>
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider mode="light">
            <FacadeProvider facades={{corridaFacade}}>
              <PassageiroScreen />
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
      'Selecione um destino',
    );
  });

  it('opens search overlay when search bar is focused', async () => {
    const {getByTestId} = renderScreen();

    await act(async () => {
      fireEvent(getByTestId('search-bar-input'), 'focus');
    });

    expect(getByTestId('search-overlay')).toBeTruthy();
  });

  it('calls searchLocations and shows results when user types', async () => {
    const facade = createMockCorridaFacade();
    const {getByTestId, findByTestId} = renderScreen(facade);

    await act(async () => {
      fireEvent(getByTestId('search-bar-input'), 'focus');
      fireEvent.changeText(getByTestId('search-bar-input'), 'Prefeitura');
    });

    // Wait for debounce + async search
    await waitFor(
      () => {
        expect(facade.searchLocations).toHaveBeenCalledWith('Prefeitura');
      },
      {timeout: 1000},
    );

    const resultsList = await findByTestId('search-results-list');
    expect(resultsList).toBeTruthy();
  });

  it('selects a destination and updates the bottom sheet', async () => {
    const facade = createMockCorridaFacade();
    const {getByTestId, findByTestId} = renderScreen(facade);

    await act(async () => {
      fireEvent(getByTestId('search-bar-input'), 'focus');
      fireEvent.changeText(getByTestId('search-bar-input'), 'Prefeitura');
    });

    await waitFor(() => expect(facade.searchLocations).toHaveBeenCalled(), {
      timeout: 1000,
    });

    const firstResult = await findByTestId(
      `search-result-${mockSearchResults[0].id}`,
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

  it('calls createCorrida when CTA is pressed with a destination selected', async () => {
    const facade = createMockCorridaFacade();
    const {getByTestId, findByTestId} = renderScreen(facade);

    // Select a destination first
    await act(async () => {
      fireEvent(getByTestId('search-bar-input'), 'focus');
      fireEvent.changeText(getByTestId('search-bar-input'), 'Prefeitura');
    });

    await waitFor(() => expect(facade.searchLocations).toHaveBeenCalled(), {
      timeout: 1000,
    });

    const firstResult = await findByTestId(
      `search-result-${mockSearchResults[0].id}`,
    );
    await act(async () => {
      fireEvent.press(firstResult);
    });

    await act(async () => {
      fireEvent.press(getByTestId('cta-solicitar'));
    });

    await waitFor(() => {
      expect(facade.createCorrida).toHaveBeenCalled();
    });
  });

  it('shows error state when searchLocations fails', async () => {
    const facade = createMockCorridaFacade({
      searchLocations: jest.fn().mockResolvedValue({
        data: null,
        error: {code: 'NETWORK_ERROR', message: 'Network error'},
      }),
    });

    const {getByTestId, findByTestId} = renderScreen(facade);

    await act(async () => {
      fireEvent(getByTestId('search-bar-input'), 'focus');
      fireEvent.changeText(getByTestId('search-bar-input'), 'Prefeitura');
    });

    await waitFor(() => expect(facade.searchLocations).toHaveBeenCalled(), {
      timeout: 1000,
    });

    const empty = await findByTestId('search-empty');
    expect(empty).toBeTruthy();
  });
});
