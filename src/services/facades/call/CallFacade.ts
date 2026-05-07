/**
 * @fileoverview Module implementation for services/facades/CallFacade.
 */
import {CallStatus, type Call, type CallType} from '../../../models';
import {
  type FacadeConfig,
  type FacadeError,
  type Result,
  type ApiEnvelope,
} from '../types';
import {delay, shouldFail} from '@services/mock/data';

/**
 * Call facade contract for call signaling and history operations.
 */
export interface ICallFacade {
  /**
   * Returns paginated call history entries.
   */
  getCallHistory(page: number): Promise<Result<Call[], FacadeError>>;

  /**
   * Starts a new outgoing call.
   */
  initiateCall(
    userId: string,
    type: CallType,
  ): Promise<Result<Call, FacadeError>>;

  /**
   * Answers an incoming call.
   */
  answerCall(callId: string): Promise<Result<Call, FacadeError>>;

  /**
   * Declines an incoming call.
   */
  declineCall(callId: string): Promise<Result<boolean, FacadeError>>;

  /**
   * Ends an active call.
   */
  endCall(callId: string): Promise<Result<boolean, FacadeError>>;

  /**
   * Returns currently active call when present.
   */
  getActiveCall(): Promise<Result<Call | null, FacadeError>>;
}

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T>(error: FacadeError): Result<T, FacadeError> => ({
  data: null,
  error,
});

const toFacadeError = (
  message: string,
  code = 'INTERNAL_ERROR',
): FacadeError => ({
  code,
  message,
});

/**
 * Call facade implementation for REST and signaling abstractions.
 */
export class CallFacadeImpl implements ICallFacade {
  private readonly mockMode: boolean;
  private readonly apiBaseUrl: string;
  private activeCall: Call | null = null;

  constructor(config: FacadeConfig = {}) {
    this.mockMode = Boolean(config.mockMode);
    this.apiBaseUrl = config.apiBaseUrl ?? '';
  }

  /**
   * Loads call history by page.
   */
  public async getCallHistory(
    page: number,
  ): Promise<Result<Call[], FacadeError>> {
    if (this.mockMode) {
      await delay(170);
      if (shouldFail('calls.history')) {
        return fail(toFacadeError('Mock call history failed', 'NETWORK_ERROR'));
      }

      return ok([]);
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/calls?page=${page}`);
      if (!response.ok) {
        return fail(toFacadeError('Unable to load call history'));
      }

      const payload = (await response.json()) as ApiEnvelope<Call[]>;
      return ok(payload.data);
    } catch {
      return fail(
        toFacadeError(
          'Network error while loading call history',
          'NETWORK_ERROR',
        ),
      );
    }
  }

  /**
   * Initiates an outgoing call.
   */
  public async initiateCall(
    userId: string,
    type: CallType,
  ): Promise<Result<Call, FacadeError>> {
    if (this.mockMode) {
      await delay(220);
      if (shouldFail('calls.initiate')) {
        return fail(
          toFacadeError('Mock initiate call failed', 'NETWORK_ERROR'),
        );
      }

      const mockCall: Call = {
        id: '123e4567-e89b-12d3-a456-426614174320',
        type,
        status: CallStatus.OUTGOING,
        initiatorId: userId,
        participants: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.activeCall = mockCall;
      return ok(mockCall);
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/calls`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({receiverId: userId, type}),
      });

      if (!response.ok) {
        return fail(toFacadeError('Unable to initiate call'));
      }

      const payload = (await response.json()) as ApiEnvelope<Call>;
      this.activeCall = payload.data;
      return ok(payload.data);
    } catch {
      return fail(
        toFacadeError('Network error while initiating call', 'NETWORK_ERROR'),
      );
    }
  }

  /**
   * Answers incoming call.
   */
  public async answerCall(callId: string): Promise<Result<Call, FacadeError>> {
    if (this.mockMode) {
      if (!this.activeCall) {
        return fail(toFacadeError('No active call to answer', 'NOT_FOUND'));
      }
      this.activeCall = {...this.activeCall, status: CallStatus.ACTIVE};
      return ok(this.activeCall);
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/calls/${callId}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({status: 'ANSWERED'}),
      });

      if (!response.ok) {
        return fail(toFacadeError('Unable to answer call'));
      }

      const payload = (await response.json()) as ApiEnvelope<Call>;
      this.activeCall = payload.data;
      return ok(payload.data);
    } catch {
      return fail(
        toFacadeError('Network error while answering call', 'NETWORK_ERROR'),
      );
    }
  }

  /**
   * Declines incoming call.
   */
  public async declineCall(
    callId: string,
  ): Promise<Result<boolean, FacadeError>> {
    if (this.mockMode) {
      this.activeCall = null;
      return ok(true);
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/calls/${callId}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({status: 'DECLINED'}),
      });

      if (!response.ok) {
        return fail(toFacadeError('Unable to decline call'));
      }

      this.activeCall = null;
      return ok(true);
    } catch {
      return fail(
        toFacadeError('Network error while declining call', 'NETWORK_ERROR'),
      );
    }
  }

  /**
   * Ends active call.
   */
  public async endCall(callId: string): Promise<Result<boolean, FacadeError>> {
    if (this.mockMode) {
      await delay(180);
      if (shouldFail('calls.end')) {
        return fail(toFacadeError('Mock end call failed', 'NETWORK_ERROR'));
      }

      this.activeCall = null;
      return ok(true);
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/calls/${callId}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({status: 'ENDED'}),
      });

      if (!response.ok) {
        return fail(toFacadeError('Unable to end call'));
      }

      this.activeCall = null;
      return ok(true);
    } catch {
      return fail(
        toFacadeError('Network error while ending call', 'NETWORK_ERROR'),
      );
    }
  }

  /**
   * Returns active call from facade state.
   */
  public async getActiveCall(): Promise<Result<Call | null, FacadeError>> {
    return ok(this.activeCall);
  }
}
