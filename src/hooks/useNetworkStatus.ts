/**
 * @fileoverview Hook module for useNetworkStatus.
 */
import {useEffect} from 'react';
import {
  addNetworkStateListener,
  getNetworkStateAsync,
  type NetworkState,
} from 'expo-network';
import {useAppDispatch, useAppSelector} from '../store';
import {setIsConnected} from '@store/slices/uiSlice';
import {logger} from '@utils/logger';

/**
 * Maps expo-network state to a strict boolean connection flag.
 *
 * @param networkState Current network state payload.
 * @returns True when the device is connected, otherwise false.
 */
const toConnectionFlag = (networkState: NetworkState): boolean =>
  Boolean(networkState.isConnected);

/**
 * Subscribes to network connectivity changes and syncs Redux UI state.
 *
 * @returns Current connection status from Redux state.
 */
export const useNetworkStatus = (): boolean => {
  const dispatch = useAppDispatch();
  const isConnected = useAppSelector(state => state.ui.isConnected);

  useEffect(() => {
    const syncInitialState = async (): Promise<void> => {
      try {
        const initialState = await getNetworkStateAsync();
        dispatch(setIsConnected(toConnectionFlag(initialState)));
      } catch (error: unknown) {
        logger.warn(
          'useNetworkStatus',
          'Unable to read initial network state',
          error,
        );
      }
    };

    void syncInitialState();

    const subscription = addNetworkStateListener(state => {
      dispatch(setIsConnected(toConnectionFlag(state)));
    });

    return () => {
      subscription.remove();
    };
  }, [dispatch]);

  return isConnected;
};
