/**
 * @fileoverview Global Jest setup — keeps module-level auth mutex clean between tests.
 * Prevents stuck `getValidToken` refresh promises from wedging `useRealtimeSession` and
 * causing @testing-library/react-native cleanup to time out (order-dependent under maxWorkers).
 */
import {resetRefreshMutex} from './src/utils/tokenUtils';

beforeEach(() => {
  resetRefreshMutex();
});
