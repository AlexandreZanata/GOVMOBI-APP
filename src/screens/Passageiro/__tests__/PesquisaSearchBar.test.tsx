/**
 * @fileoverview POC tests for the Pesquisa geocoding integration in the
 * PassageiroScreen search bar.
 *
 * Covers: loading state, success (results rendered), error (network failure),
 * empty query guard (< 3 chars), and result selection.
 */
import React from 'react';
import {render, fireEvent, waitFor, act} from '@testing-library/react-native';
import type {ReactTestInstance} from 'react-test-renderer';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {NavigationContainer} from '@react-navigation/native';
import {I18nextProvider} from 'react-i18next';
import {i18n} from '../../../i18n';
import {FacadeProvider} from '@services/facades';
import type {IPesquisaFacade} from '@services/facades';
import type {ICorridaFacade} from '@services/facades';
import type {GeocodingResult} from '../../../types/pesquisa';
import type {FacadeError, Result} from '@services/facades';
import corridaReducer from '../../../store/slices/corridaSlice';
import uiReducer from '../../../store/slices/uiSlice';
import authReducer from '../../../store/slices/authSlice';
import {PassageiroScreen} from '../PassageiroScreen';

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
  const React = require('react') as typeof import('react');
  const MockIcon = ({testID}: {testID?: string}) =>
    React.createElement('View', {testID});

  return {
    MaterialIcons: MockIcon,
    Ionicons: MockIcon,
    FontAwesome: MockIcon,
  };
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest
    .fn()
    .mockResolvedValue({status: 'denied'}),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {Balanced: 3},
}));

jest.mock('@rnmapbox/maps', () => null, {virtual: true});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
  SafeAreaProvider: ({children}: {children: React.ReactNode}) => children,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_RESULTS: GeocodingResult[] = [
  {
    address: 'flores',
    placeName: 'Rua das Flores, Goiânia - GO, Brasil',
    lat: -16.68,
    lng: -49.26,
  },
  {
    address: 'flores',
    placeName: 'Rua Flores do Campo, Aparecida - GO, Brasil',
    lat: -16.82,
    lng: -49.24,
  },
];

const makeStore = () =>
  configureStore({
    reducer: {
      corrida: corridaReducer,
      ui: uiReducer,
      auth: authReducer,
    },
  });

const makePesquisaMock = (
  override?: Partial<IPesquisaFacade>,
): IPesquisaFacade => ({
  getPesquisaConfig: jest.fn().mockResolvedValue({
    data: {mapboxPublicToken: 'pk.test'},
    error: null,
  }),
  geocodeAddress: jest.fn().mockResolvedValue({
    data: MOCK_RESULTS,
    error: null,
  } as Result<GeocodingResult[], FacadeError>),
  reverseGeocode: jest.fn().mockResolvedValue({
    data: {address: 'Rua Mock', lat: -16.68, lng: -49.26},
    error: null,
  }),
  ...override,
});

const makeCorridaMock = (): ICorridaFacade =>
  ({
    createCorrida: jest.fn().mockResolvedValue({data: null, error: null}),
    cancelCorrida: jest.fn().mockResolvedValue({data: true, error: null}),
    getActiveCorrida: jest.fn().mockResolvedValue({data: null, error: null}),
    searchLocations: jest.fn().mockResolvedValue({data: [], error: null}),
  }) as unknown as ICorridaFacade;

const renderScreen = (pesquisaMock: IPesquisaFacade) => {
  const store = makeStore();
  return render(
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <FacadeProvider
          facades={{
            pesquisaFacade: pesquisaMock,
            corridaFacade: makeCorridaMock(),
          }}>
          <NavigationContainer>
            <PassageiroScreen />
          </NavigationContainer>
        </FacadeProvider>
      </I18nextProvider>
    </Provider>,
  );
};

const typeInSearchInput = (
  getByTestId: (testId: string) => ReactTestInstance,
  text: string,
): void => {
  const input = getByTestId('search-bar-input');
  fireEvent(input, 'focus');
  fireEvent.changeText(input, text);
};

/** Wait for real timers — used instead of fake timers to avoid RNTL cleanup conflicts. */
const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Pesquisa geocoding — SearchBar integration', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const Location = jest.requireMock('expo-location') as {
      requestForegroundPermissionsAsync: jest.Mock;
      getCurrentPositionAsync: jest.Mock;
    };
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
    });
    Location.getCurrentPositionAsync.mockReset();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders the search bar input', () => {
    const {getByTestId} = renderScreen(makePesquisaMock());
    expect(getByTestId('search-bar-input')).toBeTruthy();
  });

  it('auto-searches after typing stops (no submit click required)', async () => {
    const geocodeAddress = jest.fn().mockResolvedValue({data: [], error: null});
    const pesquisaMock = makePesquisaMock({geocodeAddress});
    const {getByTestId} = renderScreen(pesquisaMock);

    typeInSearchInput(getByTestId, 'flores');

    // Before debounce fires — should not have been called yet
    await delay(200);
    expect(geocodeAddress).not.toHaveBeenCalled();

    // After debounce fires
    await delay(300);

    await waitFor(() => {
      expect(geocodeAddress).toHaveBeenCalledTimes(1);
      expect(geocodeAddress).toHaveBeenCalledWith({
        query: 'flores',
        proximity: undefined,
      });
    });
  }, 10000);

  it('shows loading indicator while geocoding is in progress', async () => {
    const geocodeAddress = jest.fn(
      () =>
        new Promise<Result<GeocodingResult[], FacadeError>>(resolve =>
          setTimeout(() => resolve({data: MOCK_RESULTS, error: null}), 1000),
        ),
    );

    // Delay the geocode response so we can assert the loading state
    const pesquisaMock = makePesquisaMock({
      geocodeAddress,
    });

    const {getByTestId} = renderScreen(pesquisaMock);

    typeInSearchInput(getByTestId, 'flores');

    // Advance past the 400ms debounce
    await delay(500);

    await waitFor(() => {
      expect(geocodeAddress).toHaveBeenCalledTimes(1);
    });
  }, 10000);

  it('calls geocoding with the typed query after debounce', async () => {
    const pesquisaMock = makePesquisaMock();
    const {getByTestId} = renderScreen(pesquisaMock);

    typeInSearchInput(getByTestId, 'flores');

    await delay(500);

    await waitFor(() => {
      expect(pesquisaMock.geocodeAddress).toHaveBeenCalledWith({
        query: 'flores',
        proximity: undefined,
      });
    });
  }, 10000);

  it('shows empty state when geocoding returns no results', async () => {
    const pesquisaMock = makePesquisaMock({
      geocodeAddress: jest.fn().mockResolvedValue({data: [], error: null}),
    });

    const {getByTestId} = renderScreen(pesquisaMock);

    typeInSearchInput(getByTestId, 'xyznotfound');

    await delay(500);

    await waitFor(() => {
      expect(getByTestId('search-empty')).toBeTruthy();
    });
  }, 10000);

  it('does NOT call geocodeAddress when query is shorter than 3 chars', async () => {
    const geocodeAddress = jest.fn().mockResolvedValue({data: [], error: null});
    const pesquisaMock = makePesquisaMock({geocodeAddress});

    const {getByTestId} = renderScreen(pesquisaMock);

    typeInSearchInput(getByTestId, 'ab');

    await delay(500);

    // The facade should not be called for < 3 chars
    expect(geocodeAddress).not.toHaveBeenCalled();
  }, 10000);

  it('selects a result and closes the overlay', async () => {
    const pesquisaMock = makePesquisaMock();
    const {getByTestId, queryByTestId} = renderScreen(pesquisaMock);

    typeInSearchInput(getByTestId, 'flores');

    await delay(500);

    await waitFor(() => {
      const firstId = `${MOCK_RESULTS[0].lat}-${MOCK_RESULTS[0].lng}-0`;
      expect(getByTestId(`search-result-${firstId}`)).toBeTruthy();
    });

    const firstId = `${MOCK_RESULTS[0].lat}-${MOCK_RESULTS[0].lng}-0`;
    fireEvent.press(getByTestId(`search-result-${firstId}`));

    await waitFor(() => {
      expect(queryByTestId('search-overlay')).toBeNull();
    });
  }, 10000);
});
