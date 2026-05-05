/**
 * @fileoverview Contract parity checks for shared mock/API entities.
 */
import type {Run, User, Message, Call} from '../../../types';

const assertType = <T>(_value: T): void => {
  void _value;
};

describe('shared contracts', () => {
  it('accepts strict User shape', () => {
    const user: User = {
      id: 'u1',
      fullName: 'User Name',
      email: 'user@govmobile.gov',
      role: 'AGENT',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    assertType<User>(user);
  });

  it('accepts strict Run shape', () => {
    const run: Run = {
      id: 'r1',
      title: 'Run',
      description: 'Description',
      type: 'TRANSPORT',
      priority: 'LOW',
      status: 'PENDING',
      location: {
        address: 'A',
        latitude: 1,
        longitude: 1,
      },
      proofs: [],
      timeline: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    assertType<Run>(run);
  });

  it('accepts strict Message shape', () => {
    const message: Message = {
      id: 'm1',
      conversationId: 'c1',
      senderId: 'u1',
      type: 'TEXT',
      status: 'SENT',
      content: 'hello',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    assertType<Message>(message);
  });

  it('accepts strict Call shape', () => {
    const call: Call = {
      id: 'c1',
      type: 'VOICE',
      status: 'ACTIVE',
      initiatorId: 'u1',
      participants: [
        {
          id: 'cp1',
          userId: 'u1',
          displayName: 'User Name',
        },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    assertType<Call>(call);
  });
});
