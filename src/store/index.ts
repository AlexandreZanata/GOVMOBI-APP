/**
 * @fileoverview Public module exports for store/index.
 */
import {combineReducers, configureStore} from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useDispatch, useSelector, type TypedUseSelectorHook} from 'react-redux';

import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import callsReducer from './slices/callsSlice';
import notificationsReducer from './slices/notificationsSlice';
import uiReducer from './slices/uiSlice';
import corridaReducer from './slices/corridaSlice';
import {baseApi} from './api/baseApi';

// --- Persist configs ---

const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: ['user', 'token', 'isAuthenticated'],
};

const uiPersistConfig = {
  key: 'ui',
  storage: AsyncStorage,
  whitelist: ['themeMode', 'language'],
};

// --- Root reducer ---

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  chat: chatReducer,
  calls: callsReducer,
  notifications: notificationsReducer,
  ui: persistReducer(uiPersistConfig, uiReducer),
  corrida: corridaReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});

// --- Store ---

/**
 * Configured Redux store for GovMobile.
 * Auth and UI slices are persisted via AsyncStorage.
 * Chat, calls, and notifications are ephemeral (refreshed from server).
 */
export const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(baseApi.middleware),
});

export const persistor = persistStore(store);

// --- Types ---

/** Root state shape derived from the store. */
export type RootState = ReturnType<typeof rootReducer>;

/** Typed dispatch that understands thunks and RTK Query actions. */
export type AppDispatch = typeof store.dispatch;

// --- Typed hooks ---

/**
 * Typed version of `useDispatch` — use this instead of the plain hook.
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Typed version of `useSelector` — use this instead of the plain hook.
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
