/**
 * @fileoverview POC tests for route preview behavior in usePassageiro.
 */
import React from 'react';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {Text, Pressable, View} from 'react-native';
import {I18nextProvider} from 'react-i18next';
import {FacadeProvider, type FacadeError, type Result} from '@services/facades';
import {i18n} from '@i18n/index';
import authReducer, {setPapeis, setToken} from '@store/slices/authSlice';
import corridaReducer from '@store/slices/corridaSlice';
import uiReducer from '@store/slices/uiSlice';
import {usePassageiro} from '../usePassageiro';
import type {
  GeocodingResult,
  GetRouteInput,
  PesquisaConfig,
  PesquisaRouteResult,
  ReverseGeocodingResult,
} from '../../../types/pesquisa';
import type {IPesquisaFacade} from '@services/facades/PesquisaFacade';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest
    .fn()
    .mockResolvedValue({status: 'granted'}),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: {latitude: -23.5505, longitude: -46.6333},
  }),
  Accuracy: {Balanced: 3},
}));

const ok = <T,>(data: T): Result<T, FacadeError> => ({data, error: null});

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const createDeferred = <T,>(): Deferred<T> => {
  let resolveRef: ((value: T) => void) | null = null;
  const promise = new Promise<T>(resolve => {
    resolveRef = resolve;
  });

  return {
    promise,
    resolve: value => {
      if (resolveRef) {
        resolveRef(value);
      }
    },
  };
};

const defaultRoute: PesquisaRouteResult = {
  geometry: {
    type: 'LineString',
    coordinates: [
      [-46.6333, -23.5505],
      [-46.6345, -23.5514],
      [-46.636, -23.553],
    ],
  },
  distanciaMetros: 430,
  duracaoSegundos: 155,
};

const destinationResult = {
  id: 'dest-1',
  placeName: 'Prefeitura Municipal',
  address: 'Avenida Brasil, 123',
  coordinates: {
    latitude: -23.553,
    longitude: -46.636,
  },
};

const createPesquisaFacade = (
  routeResolver?: () => Promise<Result<PesquisaRouteResult, FacadeError>>,
): IPesquisaFacade => ({
  getPesquisaConfig: jest
    .fn<Promise<Result<PesquisaConfig, FacadeError>>, []>()
    .mockResolvedValue(ok({mapboxPublicToken: 'pk.mock'})),
  geocodeAddress: jest
    .fn<
      Promise<Result<GeocodingResult[], FacadeError>>,
      [{query: string; proximity?: {lat: number; lng: number}}]
    >()
    .mockResolvedValue(ok([])),
  reverseGeocode: jest
    .fn<
      Promise<Result<ReverseGeocodingResult, FacadeError>>,
      [{lat: number; lng: number}]
    >()
    .mockResolvedValue(ok({address: 'Mock address', lat: -23.55, lng: -46.63})),
  getRouteBetweenPoints: jest
    .fn<Promise<Result<PesquisaRouteResult, FacadeError>>, [GetRouteInput]>()
    .mockImplementation(() =>
      routeResolver ? routeResolver() : Promise.resolve(ok(defaultRoute)),
    ),
});

const Probe = (): React.JSX.Element => {
  const state = usePassageiro();

  return (
    <View>
      <Text testID="is-locating">{String(state.isLocating)}</Text>
      <Text testID="is-routing">{String(state.isRouting)}</Text>
      <Text testID="route-feedback">{state.routeFeedback ?? 'none'}</Text>
      <Text testID="route-count">
        {String(state.routePreviewCoords.length)}
      </Text>
      <Text testID="route-distance">
        {String(state.routeDistanceMeters ?? 0)}
      </Text>
      <Text testID="route-duration">
        {String(state.routeDurationSeconds ?? 0)}
      </Text>
      <Text testID="can-preview">{String(state.canPreviewRoute)}</Text>
      <Pressable
        onPress={() => state.onSelectResult(destinationResult)}
        testID="select-destination">
        <Text>select</Text>
      </Pressable>
    </View>
  );
};

const renderProbe = (facade: IPesquisaFacade) => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      corrida: corridaReducer,
      ui: uiReducer,
    },
  });

  store.dispatch(setToken('token-123'));
  store.dispatch(setPapeis(['USUARIO']));

  const view = render(
    <I18nextProvider i18n={i18n}>
      <Provider store={store}>
        <FacadeProvider facades={{pesquisaFacade: facade}}>
          <Probe />
        </FacadeProvider>
      </Provider>
    </I18nextProvider>,
  );

  return {store, ...view};
};

describe('usePassageiro route preview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state while route request is pending', async () => {
    const deferred = createDeferred<Result<PesquisaRouteResult, FacadeError>>();
    const facade = createPesquisaFacade(() => deferred.promise);
    const {getByTestId} = renderProbe(facade);

    await waitFor(() => {
      expect(getByTestId('is-locating').props.children).toBe('false');
    });

    await act(async () => {
      fireEvent.press(getByTestId('select-destination'));
    });

    await waitFor(() => {
      expect(getByTestId('is-routing').props.children).toBe('true');
      expect(getByTestId('route-feedback').props.children).toBe(
        i18n.t('pesquisa.route.loading'),
      );
    });

    await act(async () => {
      deferred.resolve(ok(defaultRoute));
    });
  });

  it('stores successful route preview data after request resolves', async () => {
    const facade = createPesquisaFacade();
    const {getByTestId} = renderProbe(facade);

    await waitFor(() => {
      expect(getByTestId('is-locating').props.children).toBe('false');
    });

    await act(async () => {
      fireEvent.press(getByTestId('select-destination'));
    });

    await waitFor(() => {
      expect(getByTestId('is-routing').props.children).toBe('false');
      expect(getByTestId('route-count').props.children).toBe('3');
      expect(getByTestId('route-distance').props.children).toBe('430');
      expect(getByTestId('route-duration').props.children).toBe('155');
    });
  });

  it('stores route error feedback when request fails', async () => {
    const facade = createPesquisaFacade(() =>
      Promise.resolve({
        data: null,
        error: {code: 'NETWORK_ERROR', message: 'Route failed'},
      }),
    );
    const {getByTestId} = renderProbe(facade);

    await waitFor(() => {
      expect(getByTestId('is-locating').props.children).toBe('false');
    });

    await act(async () => {
      fireEvent.press(getByTestId('select-destination'));
    });

    await waitFor(() => {
      expect(getByTestId('route-count').props.children).toBe('0');
      expect(getByTestId('route-feedback').props.children).toBe(
        i18n.t('pesquisa.route.error'),
      );
    });
  });

  it('calls route endpoint with user and destination coordinates', async () => {
    const facade = createPesquisaFacade();
    const {getByTestId} = renderProbe(facade);

    await waitFor(() => {
      expect(getByTestId('is-locating').props.children).toBe('false');
    });

    await act(async () => {
      fireEvent.press(getByTestId('select-destination'));
    });

    await waitFor(() => {
      expect(facade.getRouteBetweenPoints).toHaveBeenCalledWith({
        origemLat: -23.5505,
        origemLng: -46.6333,
        destinoLat: -23.553,
        destinoLng: -46.636,
      });
    });
  });
});
