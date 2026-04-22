/**
 * @fileoverview Unit tests for shared location slice.
 */
import reducer, {
  setLocationFailure,
  setLocationSuccess,
  setPermissionStatus,
  startLocationRefresh,
  type LocationState,
} from '../slices/locationSlice';

describe('locationSlice', () => {
  const initialState: LocationState = {
    permissionStatus: 'unknown',
    fixStatus: 'idle',
    current: null,
    lastKnown: null,
    lastFixAt: null,
    error: null,
  };

  it('marks state as locating when refresh starts', () => {
    const next = reducer(initialState, startLocationRefresh());
    expect(next.fixStatus).toBe('locating');
    expect(next.error).toBeNull();
  });

  it('stores the latest successful coordinates as current and lastKnown', () => {
    const now = Date.now();
    const next = reducer(
      initialState,
      setLocationSuccess({
        coords: {latitude: -2.53, longitude: -44.3},
        timestamp: now,
      }),
    );

    expect(next.current).toEqual({latitude: -2.53, longitude: -44.3});
    expect(next.lastKnown).toEqual({latitude: -2.53, longitude: -44.3});
    expect(next.lastFixAt).toBe(now);
    expect(next.fixStatus).toBe('ready');
    expect(next.permissionStatus).toBe('granted');
  });

  it('stores location failures without clearing lastKnown', () => {
    const withLastKnown: LocationState = {
      ...initialState,
      lastKnown: {latitude: -2.529, longitude: -44.301},
    };

    const next = reducer(withLastKnown, setLocationFailure('LOCATION_UNAVAILABLE'));

    expect(next.fixStatus).toBe('error');
    expect(next.error).toBe('LOCATION_UNAVAILABLE');
    expect(next.lastKnown).toEqual({latitude: -2.529, longitude: -44.301});
  });

  it('updates permission status explicitly', () => {
    const next = reducer(initialState, setPermissionStatus('denied'));
    expect(next.permissionStatus).toBe('denied');
  });
});

