/**
 * @fileoverview Type definitions for the facades module.
 */
export type Result<T, E> = {data: T; error: null} | {data: null; error: E};

export interface FacadeError {
  code: string;
  message: string;
  statusCode?: number;
  retryable?: boolean;
}

export interface FacadeConfig {
  mockMode?: boolean;
  apiBaseUrl?: string;
}

export interface ApiEnvelope<T> {
  data: T;
  error?: {
    code?: string;
    message?: string;
  } | null;
}
