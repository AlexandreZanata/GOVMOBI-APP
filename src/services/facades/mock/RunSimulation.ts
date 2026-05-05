/**
 * @fileoverview Timed run lifecycle simulation utilities.
 */
import type {Run, CreateRunInput} from '../../../types';
import {mockId} from '@services/mock/data';

/**
 * Produces a realistic incoming run payload.
 *
 * @returns Synthetic run object in PENDING state.
 */
export const simulateIncomingRun = (): Run => {
  const now = new Date().toISOString();
  return {
    id: mockId('run'),
    title: 'Emergency Utility Dispatch',
    description: 'Investigate outage alert and submit field evidence.',
    type: 'EMERGENCY_DISPATCH',
    priority: 'CRITICAL',
    status: 'PENDING',
    location: {
      address: 'Rua do Governo 455',
      latitude: -23.545,
      longitude: -46.638,
    },
    proofs: [],
    timeline: [],
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Creates a run payload from user input.
 *
 * @param input Run creation input contract.
 * @returns New run in PENDING state.
 */
export const createRunFromInput = (input: CreateRunInput): Run => {
  const now = new Date().toISOString();

  return {
    id: mockId('run'),
    title: input.title,
    description: input.description,
    type: input.type,
    priority: input.priority,
    status: 'PENDING',
    location: input.location,
    proofs: [],
    timeline: [],
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Schedules automatic run progression through operational states.
 *
 * @param run Current run instance.
 * @param onTransition Callback invoked on each state transition.
 * @returns Cleanup callback that cancels pending timers.
 */
export const scheduleRunLifecycle = (
  run: Run,
  onTransition: (next: Run) => void,
): (() => void) => {
  const timers: ReturnType<typeof setTimeout>[] = [];

  const assignTimer = setTimeout(() => {
    onTransition({
      ...run,
      status: 'ASSIGNED',
      updatedAt: new Date().toISOString(),
    });
  }, 1200);
  timers.push(assignTimer);

  const progressTimer = setTimeout(() => {
    onTransition({
      ...run,
      status: 'IN_PROGRESS',
      updatedAt: new Date().toISOString(),
    });
  }, 2400);
  timers.push(progressTimer);

  const completeTimer = setTimeout(() => {
    onTransition({
      ...run,
      status: 'COMPLETED',
      updatedAt: new Date().toISOString(),
    });
  }, 3600);
  timers.push(completeTimer);

  return () => {
    timers.forEach(timer => clearTimeout(timer));
  };
};
