/**
 * @fileoverview Mock run facade with lifecycle simulation and incoming assignments.
 */
import type {CreateRunInput, Run, RunProof, RunStatus} from '../../../types';
import {
  type CompleteRunPayload,
  type IRunFacade,
  type RunFilters,
} from '../RunFacade';
import {type FacadeError, type Result} from '../types';
import {delay, shouldFail, mockId} from '@services/mock/data';
import {loadMockState, saveMockState} from '@services/mock/data';
import {
  createRunFromInput,
  scheduleRunLifecycle,
  simulateIncomingRun,
} from './RunSimulation';

interface RunEvents {
  incomingRun: Run;
  runUpdated: Run;
}

/**
 * Minimal typed event emitter — no Node built-ins, safe for React Native.
 */
class NativeEventEmitter {
  private readonly listeners = new Map<string, Set<(payload: unknown) => void>>();

  on<K extends string, T>(event: K, handler: (payload: T) => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler as (p: unknown) => void);
  }

  off<K extends string, T>(event: K, handler: (payload: T) => void): void {
    this.listeners.get(event)?.delete(handler as (p: unknown) => void);
  }

  emit<K extends string, T>(event: K, payload: T): void {
    this.listeners.get(event)?.forEach(h => h(payload));
  }
}

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
 * Run mock implementation.
 * Simulated latency: 200-520ms.
 * Failure probability: deterministic 10-20% depending on operation key.
 */
export class RunFacadeMock implements IRunFacade {
  private readonly stream = new NativeEventEmitter();
  private lifecycleCleanups = new Map<string, () => void>();

  public async createRun(
    input: CreateRunInput,
  ): Promise<Result<Run, FacadeError>> {
    await delay(220);
    if (shouldFail('runs.create')) {
      return fail(toError('Mock create run failed', 'NETWORK_ERROR'));
    }

    const run = createRunFromInput(input);
    const state = await loadMockState();
    state.runs.unshift(run);
    await saveMockState(state);
    this.startLifecycleSimulation(run.id);

    return ok(run);
  }

  public async assignRun(
    runId: string,
    agentId: string,
  ): Promise<Result<Run, FacadeError>> {
    return this.transitionRun(runId, 'ASSIGNED', {
      dispatcherId: 'user-dispatch-001',
      agentId,
      assignedAt: new Date().toISOString(),
    });
  }

  public async acceptRun(runId: string): Promise<Result<Run, FacadeError>> {
    const result = await this.getRunById(runId);
    if (!result.data) {
      return fail(toError('Run not found', 'NOT_FOUND'));
    }

    const state = await loadMockState();
    const updated = state.runs.map(current =>
      current.id === runId
        ? {
            ...current,
            assignment: current.assignment
              ? {...current.assignment, acceptedAt: new Date().toISOString()}
              : undefined,
            updatedAt: new Date().toISOString(),
          }
        : current,
    );
    state.runs = updated;
    await saveMockState(state);

    const run = updated.find(current => current.id === runId) ?? result.data;
    return ok(run);
  }

  public async rejectRun(
    runId: string,
    reason: string,
  ): Promise<Result<Run, FacadeError>> {
    const state = await loadMockState();
    const target = state.runs.find(run => run.id === runId);
    if (!target) {
      return fail(toError('Run not found', 'NOT_FOUND'));
    }

    const updated: Run = {
      ...target,
      status: 'PENDING',
      assignment: target.assignment
        ? {
            ...target.assignment,
            rejectedAt: new Date().toISOString(),
            rejectionReason: reason,
          }
        : undefined,
      updatedAt: new Date().toISOString(),
    };

    state.runs = state.runs.map(run => (run.id === runId ? updated : run));
    await saveMockState(state);
    this.stream.emit('runUpdated', updated);

    return ok(updated);
  }

  public async startRun(runId: string): Promise<Result<Run, FacadeError>> {
    return this.transitionRun(runId, 'IN_PROGRESS');
  }

  public async completeRun(
    runId: string,
    payload: CompleteRunPayload,
  ): Promise<Result<Run, FacadeError>> {
    const transition = await this.transitionRun(runId, 'COMPLETED');
    if (!transition.data) {
      return transition;
    }

    const completed: Run = {
      ...transition.data,
      proofs: [...transition.data.proofs, ...payload.proofs],
      timeline: [
        ...transition.data.timeline,
        {
          id: mockId('run-event'),
          runId,
          fromStatus: 'IN_PROGRESS',
          toStatus: 'COMPLETED',
          actorId: transition.data.assignment?.agentId ?? 'user-agent-001',
          note: payload.notes,
          occurredAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    const state = await loadMockState();
    state.runs = state.runs.map(run => (run.id === runId ? completed : run));
    await saveMockState(state);

    this.stopLifecycleSimulation(runId);
    this.stream.emit('runUpdated', completed);
    return ok(completed);
  }

  public async cancelRun(
    runId: string,
    reason: string,
  ): Promise<Result<Run, FacadeError>> {
    const transition = await this.transitionRun(runId, 'CANCELLED');
    if (!transition.data) {
      return transition;
    }

    const cancelled: Run = {
      ...transition.data,
      timeline: [
        ...transition.data.timeline,
        {
          id: mockId('run-event'),
          runId,
          fromStatus: transition.data.status,
          toStatus: 'CANCELLED',
          actorId: 'user-dispatch-001',
          note: reason,
          occurredAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    const state = await loadMockState();
    state.runs = state.runs.map(run => (run.id === runId ? cancelled : run));
    await saveMockState(state);

    this.stopLifecycleSimulation(runId);
    this.stream.emit('runUpdated', cancelled);
    return ok(cancelled);
  }

  public async uploadRunProof(
    runId: string,
    proof: RunProof,
  ): Promise<Result<RunProof, FacadeError>> {
    await delay(420);
    if (shouldFail('runs.uploadProof')) {
      return fail(toError('Mock proof upload failed', 'NETWORK_ERROR'));
    }

    const state = await loadMockState();
    state.runs = state.runs.map(run =>
      run.id === runId
        ? {
            ...run,
            proofs: [...run.proofs, proof],
            updatedAt: new Date().toISOString(),
          }
        : run,
    );
    await saveMockState(state);

    return ok(proof);
  }

  public async listRuns(
    filters?: RunFilters,
  ): Promise<Result<Run[], FacadeError>> {
    await delay(200);
    if (shouldFail('runs.list')) {
      return fail(toError('Mock list runs failed', 'NETWORK_ERROR'));
    }

    const state = await loadMockState();
    const filtered = state.runs.filter(run => {
      if (filters?.status && run.status !== filters.status) {
        return false;
      }
      return !(filters?.agentId && run.assignment?.agentId !== filters.agentId);

    });

    return ok(filtered);
  }

  public async getRunById(
    runId: string,
  ): Promise<Result<Run | null, FacadeError>> {
    await delay(120);
    const state = await loadMockState();
    const found = state.runs.find(run => run.id === runId) ?? null;
    return ok(found);
  }

  /**
   * Generates and emits a synthetic incoming run assignment.
   *
   * @returns New incoming run payload.
   */
  public async simulateIncomingRun(): Promise<Result<Run, FacadeError>> {
    await delay(260);
    const run = simulateIncomingRun();

    const state = await loadMockState();
    state.runs.unshift(run);
    await saveMockState(state);

    this.stream.emit('incomingRun', run);
    this.startLifecycleSimulation(run.id);

    return ok(run);
  }

  /**
   * Subscribes to run simulation events.
   *
   * @template T Event key type.
   * @param eventName Event name.
   * @param handler Event handler callback.
   * @returns Unsubscribe function.
   */
  public on<T extends keyof RunEvents>(
    eventName: T,
    handler: (payload: RunEvents[T]) => void,
  ): () => void {
    this.stream.on(eventName, handler);

    return () => {
      this.stream.off(eventName, handler);
    };
  }

  private async transitionRun(
    runId: string,
    status: RunStatus,
    assignment?: Run['assignment'],
  ): Promise<Result<Run, FacadeError>> {
    await delay(210);
    if (shouldFail(`runs.transition.${status.toLowerCase()}`)) {
      return fail(toError('Mock run transition failed', 'NETWORK_ERROR'));
    }

    const state = await loadMockState();
    const current = state.runs.find(run => run.id === runId);
    if (!current) {
      return fail(toError('Run not found', 'NOT_FOUND'));
    }

    const next: Run = {
      ...current,
      status,
      assignment: assignment ?? current.assignment,
      timeline: [
        ...current.timeline,
        {
          id: mockId('run-event'),
          runId,
          fromStatus: current.status,
          toStatus: status,
          actorId: 'system',
          occurredAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    state.runs = state.runs.map(run => (run.id === runId ? next : run));
    await saveMockState(state);

    this.stream.emit('runUpdated', next);
    return ok(next);
  }

  private startLifecycleSimulation(runId: string): void {
    this.stopLifecycleSimulation(runId);

    void this.getRunById(runId).then(result => {
      if (!result.data) {
        return;
      }

      const cleanup = scheduleRunLifecycle(result.data, next => {
        void this.persistScheduledTransition(next);
      });
      this.lifecycleCleanups.set(runId, cleanup);
    });
  }

  private stopLifecycleSimulation(runId: string): void {
    const existing = this.lifecycleCleanups.get(runId);
    if (existing) {
      existing();
      this.lifecycleCleanups.delete(runId);
    }
  }

  private async persistScheduledTransition(next: Run): Promise<void> {
    const state = await loadMockState();
    state.runs = state.runs.map(run => (run.id === next.id ? next : run));
    await saveMockState(state);
    this.stream.emit('runUpdated', next);

    if (next.status === 'COMPLETED' || next.status === 'CANCELLED') {
      this.stopLifecycleSimulation(next.id);
    }
  }
}
