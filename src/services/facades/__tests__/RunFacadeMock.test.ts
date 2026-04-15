/**
 * @fileoverview Test suite for RunFacadeMock.
 */
import {RunFacadeMock} from '../mock/RunFacadeMock';
import {resetMockState} from '../../mock/data/storage';
import type {CreateRunInput, Run} from '../../../types';

const createInput: CreateRunInput = {
  title: 'Inspection Task',
  description: 'Verify compliance checklist in sector 9.',
  type: 'INSPECTION',
  priority: 'HIGH',
  location: {
    address: 'Rua Nova 300',
    latitude: -23.5,
    longitude: -46.6,
  },
};

describe('RunFacadeMock', () => {
  beforeEach(async () => {
    await resetMockState();
  });

  it('creates a run with shared contract', async () => {
    const facade = new RunFacadeMock();
    const result = await facade.createRun(createInput);

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();

    const run = result.data as Run;
    expect(run.status).toBe('PENDING');
    expect(run.location.address).toBe(createInput.location.address);
  });

  it('simulates incoming run events', async () => {
    const facade = new RunFacadeMock();
    const incomingSpy = jest.fn();
    const unsubscribe = facade.on('incomingRun', incomingSpy);

    const result = await facade.simulateIncomingRun();

    expect(result.error).toBeNull();
    expect(result.data?.status).toBe('PENDING');
    expect(incomingSpy).toHaveBeenCalled();

    unsubscribe();
  });
});
