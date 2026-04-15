import {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react';
import {ENV} from '../../config/env';

// Inline type to avoid circular dependency with store/index.ts
interface StoreState {
  auth: {token: string | null};
}

/**
 * RTK Query base API instance for GovMobile.
 *
 * All feature API slices should inject endpoints into this base using
 * `baseApi.injectEndpoints()` to share the same cache and middleware.
 *
 * @example
 * export const runsApi = baseApi.injectEndpoints({
 *   endpoints: builder => ({
 *     getRuns: builder.query<Run[], void>({ query: () => '/runs' }),
 *   }),
 * });
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: ENV.apiUrl,
    prepareHeaders: (headers, {getState}) => {
      const token = (getState() as StoreState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['User', 'Conversation', 'Message', 'Call', 'Notification', 'Run'],
  endpoints: () => ({}),
});
