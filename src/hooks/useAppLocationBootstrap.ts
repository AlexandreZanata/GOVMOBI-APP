/**
 * @fileoverview App-wide location bootstrap for app start, resume and login.
 */
import {useCallback, useEffect, useRef} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {useAppDispatch, useAppSelector} from '../store';
import {
  setLocationFailure,
  setLocationSuccess,
  setPermissionStatus,
  startLocationRefresh,
} from '@store/slices/locationSlice';
import {locationService} from '@services/location';

const REFRESH_DEBOUNCE_MS = 1500;

export const useAppLocationBootstrap = (): void => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const previousAuthRef = useRef(isAuthenticated);
  const lastRefreshAtRef = useRef(0);

  const refreshLocation = useCallback(
    async (force = false): Promise<void> => {
      const now = Date.now();
      if (!force && now - lastRefreshAtRef.current < REFRESH_DEBOUNCE_MS) {
        return;
      }
      lastRefreshAtRef.current = now;

      dispatch(startLocationRefresh());

      const result = await locationService.refreshLocation();
      dispatch(setPermissionStatus(result.permissionStatus));

      if (result.coords) {
        dispatch(
          setLocationSuccess({
            coords: result.coords,
            timestamp: Date.now(),
          }),
        );
        return;
      }

      dispatch(setLocationFailure(result.error));
    },
    [dispatch],
  );

  useEffect(() => {
    void refreshLocation(true);
  }, [refreshLocation]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if ((prev === 'inactive' || prev === 'background') && next === 'active') {
        void refreshLocation(true);
      }
    });

    return () => {
      sub.remove();
    };
  }, [refreshLocation]);

  useEffect(() => {
    const wasAuthenticated = previousAuthRef.current;
    previousAuthRef.current = isAuthenticated;

    if (!wasAuthenticated && isAuthenticated) {
      void refreshLocation(true);
    }
  }, [isAuthenticated, refreshLocation]);
};


