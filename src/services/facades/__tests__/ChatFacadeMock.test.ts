/**
 * @fileoverview Test suite for ChatFacadeMock.
 */
import {ChatFacadeMock} from '../mock/ChatFacadeMock';
import {resetMockState} from '@services/mock/data';

describe('ChatFacadeMock', () => {
  beforeEach(async () => {
    await resetMockState();
  });

  it('returns conversations with valid contracts', async () => {
    const facade = new ChatFacadeMock();
    let result = await facade.getConversations();

    if (result.error) {
      result = await facade.getConversations();
    }

    if (result.error) {
      result = await facade.getConversations();
    }

    expect(result.error).toBeNull();
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('emits realtime message events', () => {
    const facade = new ChatFacadeMock();
    const realtimeSpy = jest.fn();
    const unsubscribe = facade.onRealtimeEvent(event => {
      if (event.type === 'message' && event.message) {
        realtimeSpy(event.message.content);
      }
    });

    const cleanup = facade.startRealtimeSimulation('conv-001');

    expect(realtimeSpy).toHaveBeenCalled();

    unsubscribe();
    cleanup();
  });
});
