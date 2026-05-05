/**
 * @fileoverview Mock call facade with deterministic latency and failures.
 */
import {CallStatus, type Call, type CallType} from '@models/Call';
import {type ICallFacade} from '../CallFacade';
import {type FacadeError, type Result} from '../types';
import {delay, mockId, shouldFail} from '@services/mock/data';
import {loadMockState, saveMockState} from '@services/mock/data';

const ok = <T>(data: T): Result<T, FacadeError> => ({data, error: null});
const fail = <T>(error: FacadeError): Result<T, FacadeError> => ({
  data: null,
  error,
});

const toError = (message: string, code = 'INTERNAL_ERROR'): FacadeError => ({
  code,
  message,
  retryable: code === 'NETWORK_ERROR',
});

/**
 * Call mock implementation.
 * Simulated latency: 140-320ms.
 * Failure probability: deterministic 10-20% by operation key.
 */
export class CallFacadeMock implements ICallFacade {
  private activeCall: Call | null = null;

  /**
   * Returns paginated mock call history.
   *
   * @param page Requested page number.
   * @returns Call history list.
   */
  public async getCallHistory(
    page: number,
  ): Promise<Result<Call[], FacadeError>> {
    await delay(140 + Math.min(page, 3) * 30);
    const state = await loadMockState();
    return ok(
      state.calls.map(call => ({
        id: call.id,
        type: call.type as CallType,
        status: call.status as CallStatus,
        initiatorId: call.initiatorId,
        participants: call.participants.map(participant => ({
          id: participant.id,
          userId: participant.userId,
          callId: call.id,
          displayName: participant.displayName,
          createdAt: call.createdAt,
          updatedAt: call.updatedAt,
        })),
        duration: call.duration
          ? {
              id: `${call.id}-duration`,
              totalSeconds: call.duration.totalSeconds,
              createdAt: call.createdAt,
              updatedAt: call.updatedAt,
            }
          : undefined,
        createdAt: call.createdAt,
        updatedAt: call.updatedAt,
      })),
    );
  }

  /**
   * Starts an outgoing mock call session.
   *
   * @param userId Receiver user identifier.
   * @param type Call type.
   * @returns Newly created call.
   */
  public async initiateCall(
    userId: string,
    type: CallType,
  ): Promise<Result<Call, FacadeError>> {
    await delay(220);
    if (shouldFail('calls.initiate')) {
      return fail(toError('Mock initiate call failed', 'NETWORK_ERROR'));
    }

    const now = new Date().toISOString();
    const created: Call = {
      id: mockId('call'),
      type,
      status: CallStatus.OUTGOING,
      initiatorId: 'user-agent-001',
      participants: [
        {
          id: mockId('call-participant'),
          userId,
          callId: 'pending',
          displayName: 'Remote User',
          createdAt: now,
          updatedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    this.activeCall = created;
    return ok(created);
  }

  /**
   * Accepts an incoming mock call.
   *
   * @param callId Call identifier.
   * @returns Updated active call in ACTIVE state.
   */
  public async answerCall(callId: string): Promise<Result<Call, FacadeError>> {
    await delay(170);
    if (!this.activeCall || this.activeCall.id !== callId) {
      return fail(toError('Call not found', 'NOT_FOUND'));
    }

    this.activeCall = {
      ...this.activeCall,
      status: CallStatus.ACTIVE,
      updatedAt: new Date().toISOString(),
    };

    return ok(this.activeCall);
  }

  /**
   * Declines an incoming mock call.
   *
   * @param callId Call identifier.
   * @returns True when declined.
   */
  public async declineCall(
    callId: string,
  ): Promise<Result<boolean, FacadeError>> {
    await delay(140);
    if (this.activeCall && this.activeCall.id === callId) {
      this.activeCall = null;
    }
    return ok(true);
  }

  /**
   * Ends an active mock call.
   *
   * @param callId Call identifier.
   * @returns True when ended.
   */
  public async endCall(callId: string): Promise<Result<boolean, FacadeError>> {
    await delay(180);
    if (shouldFail('calls.end')) {
      return fail(toError('Mock end call failed', 'NETWORK_ERROR'));
    }

    if (this.activeCall && this.activeCall.id === callId) {
      const endedAt = new Date().toISOString();
      const state = await loadMockState();
      state.calls.unshift({
        id: this.activeCall.id,
        runId: undefined,
        type: this.activeCall.type,
        status: 'ENDED',
        initiatorId: this.activeCall.initiatorId,
        participants: this.activeCall.participants.map(participant => ({
          id: participant.id,
          userId: participant.userId,
          displayName: participant.displayName,
        })),
        duration: {
          totalSeconds: 90,
          startedAt: this.activeCall.createdAt,
          endedAt,
        },
        createdAt: this.activeCall.createdAt,
        updatedAt: endedAt,
      });
      await saveMockState(state);
      this.activeCall = null;
    }

    return ok(true);
  }

  /**
   * Returns active call reference from in-memory simulation.
   *
   * @returns Active call or null.
   */
  public async getActiveCall(): Promise<Result<Call | null, FacadeError>> {
    await delay(100);
    return ok(this.activeCall);
  }
}
