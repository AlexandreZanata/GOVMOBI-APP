/**
 * @fileoverview Persisted storage primitives for mock backend state.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Call, Conversation, Message, Run, User} from '../../../types';
import {
  createSeedCalls,
  createSeedConversations,
  createSeedMessages,
  createSeedRuns,
  createSeedUsers,
} from './seedData';

const MOCK_STATE_KEY = 'govmobile_mock_state_v1';

export interface MockAuthSession {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
}

export interface MockState {
  users: User[];
  runs: Run[];
  conversations: Conversation[];
  messages: Message[];
  calls: Call[];
  auth: MockAuthSession;
}

const createInitialState = (): MockState => ({
  users: createSeedUsers(),
  runs: createSeedRuns(),
  conversations: createSeedConversations(),
  messages: createSeedMessages(),
  calls: createSeedCalls(),
  auth: {
    accessToken: null,
    refreshToken: null,
    userId: null,
  },
});

/**
 * Loads persisted mock backend state.
 *
 * @returns Persisted state when available, otherwise a seeded initial state.
 */
export const loadMockState = async (): Promise<MockState> => {
  const raw = await AsyncStorage.getItem(MOCK_STATE_KEY);
  if (!raw) {
    const initial = createInitialState();
    await saveMockState(initial);
    return initial;
  }

  try {
    return JSON.parse(raw) as MockState;
  } catch {
    const fallback = createInitialState();
    await saveMockState(fallback);
    return fallback;
  }
};

/**
 * Persists mock backend state to local storage.
 *
 * @param state Full in-memory mock state.
 * @returns Promise that resolves when state is saved.
 */
export const saveMockState = async (state: MockState): Promise<void> => {
  await AsyncStorage.setItem(MOCK_STATE_KEY, JSON.stringify(state));
};

/**
 * Replaces persisted mock state with deterministic seed data.
 *
 * @returns Freshly reset mock state.
 */
export const resetMockState = async (): Promise<MockState> => {
  const initial = createInitialState();
  await saveMockState(initial);
  return initial;
};
