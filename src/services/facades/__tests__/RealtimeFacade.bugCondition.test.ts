/**
 * @fileoverview Bug condition exploration tests + Preservation tests for RealtimeFacade.
 *
 * Bug condition tests encode EXPECTED (correct) behavior and MUST FAIL on unfixed code.
 * Failure confirms the bugs exist. Do NOT fix the source code when they fail.
 *
 * Preservation tests MUST PASS on unfixed code. They establish the baseline behavior
 * that the fix must not regress.
 *
 * Bug 1: First onConnected emits 'reconnecting' instead of 'connected'
 * Preservation 2: Subsequent reconnects (wasEverConnected=true) still emit 'reconnecting'
 *
 * Validates: Requirements 1.2, 2.2, 2.3, 3.5
 * Bug_Condition: isBugCondition_InfiniteReconnect(X) where X.wasEverConnected = false
 * Expected_Behavior (Property 1): emitted_status = 'connected'
 * Preservation (Property 2): subsequent onConnected emits 'reconnecting'
 */

import {RealtimeFacadeImpl} from '../RealtimeFacade';
import type {IDespachoWebSocketClient} from '@services/websocket';
import type {RealtimeConnectionStatus} from '../../../types/realtime';
import type {FacadeError} from '../types';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Mock transport client
// ---------------------------------------------------------------------------

type ConnectionHandler = () => void;
type ErrorHandler = (err: Error) => void;
type AnyHandler = (...args: unknown[]) => void;

const createMockClient = (): jest.Mocked<IDespachoWebSocketClient> & {
  _triggerConnected: () => void;
  _triggerDisconnected: () => void;
} => {
  let connectedHandler: ConnectionHandler | null = null;
  let disconnectedHandler: ConnectionHandler | null = null;

  const client: jest.Mocked<IDespachoWebSocketClient> & {
    _triggerConnected: () => void;
    _triggerDisconnected: () => void;
  } = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    assinarCorrida: jest.fn(),
    ficarDisponivel: jest.fn(),
    atualizarPosicao: jest.fn(),
    enviarMensagem: jest.fn(),
    clearCorridaSubscriptions: jest.fn(),
    visualizarMensagens: jest.fn(),
    contarNaoVisualizadas: jest.fn(),
    setTokenRefresher: jest.fn(),
    onConnected: jest.fn().mockImplementation((handler: ConnectionHandler) => {
      connectedHandler = handler;
      return () => { connectedHandler = null; };
    }),
    onDisconnected: jest.fn().mockImplementation((handler: ConnectionHandler) => {
      disconnectedHandler = handler;
      return () => { disconnectedHandler = null; };
    }),
    onError: jest.fn().mockReturnValue(() => {}),
    onHistoricoMensagens: jest.fn().mockReturnValue(() => {}),
    onPosicaoAtualizada: jest.fn().mockReturnValue(() => {}),
    onNovaMensagem: jest.fn().mockReturnValue(() => {}),
    onStatusCorridaAlterado: jest.fn().mockReturnValue(() => {}),
    onNovaCorridaDisponivel: jest.fn().mockReturnValue(() => {}),
    onEstadoOperacional: jest.fn().mockReturnValue(() => {}),
    onReconexaoConcluida: jest.fn().mockReturnValue(() => {}),
    onMensagensVisualizadas: jest.fn().mockReturnValue(() => {}),
    onContagemNaoVisualizadas: jest.fn().mockReturnValue(() => {}),
    _triggerConnected: () => { connectedHandler?.(); },
    _triggerDisconnected: () => { disconnectedHandler?.(); },
  };

  return client;
};

// ---------------------------------------------------------------------------
// Bug 1 exploration test
// ---------------------------------------------------------------------------

describe('RealtimeFacade — Bug 1 exploration: first connect emits connected', () => {
  /**
   * Bug condition: isBugCondition_InfiniteReconnect(X) where X.wasEverConnected = false
   *
   * This test asserts the EXPECTED (correct) behavior: first onConnected should
   * emit 'connected'. On unfixed code it WILL FAIL because the facade emits
   * 'reconnecting' unconditionally.
   *
   * Counterexample: "First onConnected emits 'reconnecting' instead of 'connected'"
   *
   * Validates: Requirements 2.2 — Property 1 from design
   */
  it('emits connected (not reconnecting) on the very first onConnected transport event (wasEverConnected=false)', () => {
    const client = createMockClient();
    const facade = new RealtimeFacadeImpl({client});

    const emittedStatuses: RealtimeConnectionStatus[] = [];
    facade.onConnectionStatusChange((status: RealtimeConnectionStatus, _error: FacadeError | null) => {
      emittedStatuses.push(status);
    });

    // Fire the first onConnected transport event (wasEverConnected = false)
    client._triggerConnected();

    // EXPECTED (correct) behavior: first connect should emit 'connected'
    // ACTUAL (buggy) behavior: emits 'reconnecting'
    // This assertion WILL FAIL on unfixed code — that IS the success condition
    expect(emittedStatuses).toContain('connected');
    expect(emittedStatuses).not.toContain('reconnecting');
  });
});

// ---------------------------------------------------------------------------
// Preservation 2.1 — Subsequent reconnects emit `reconnecting`
// ---------------------------------------------------------------------------

describe('RealtimeFacade — Preservation 2.1: subsequent reconnects emit reconnecting', () => {
  /**
   * Preservation: Property 2 from design — subsequent reconnects preserve existing behavior.
   *
   * On unfixed code, onConnected ALWAYS emits 'reconnecting', so this test PASSES
   * on unfixed code (confirming the baseline behavior to preserve).
   *
   * After the fix (wasEverConnected flag), the first connect emits 'connected' and
   * subsequent connects still emit 'reconnecting'. This test must continue to pass.
   *
   * Validates: Requirements 2.3, 3.5
   */
  it('emits reconnecting on the second onConnected event (wasEverConnected=true)', () => {
    const client = createMockClient();
    const facade = new RealtimeFacadeImpl({client});

    const emittedStatuses: RealtimeConnectionStatus[] = [];
    facade.onConnectionStatusChange((status: RealtimeConnectionStatus, _error: FacadeError | null) => {
      emittedStatuses.push(status);
    });

    // First connect — on unfixed code this emits 'reconnecting'
    client._triggerConnected();
    // Simulate disconnect
    client._triggerDisconnected();
    emittedStatuses.length = 0; // reset to observe only the second connect

    // Second connect — this is a genuine reconnect, must emit 'reconnecting'
    client._triggerConnected();

    expect(emittedStatuses).toContain('reconnecting');
  });

  /**
   * Property: For all sequences of N >= 2 onConnected events, every event
   * after the first must emit 'reconnecting'.
   *
   * On unfixed code ALL events emit 'reconnecting', so this passes trivially.
   * After the fix, only the first emits 'connected'; all subsequent emit 'reconnecting'.
   */
  it('property: every onConnected after the first always emits reconnecting', () => {
    fc.assert(
      fc.property(
        // Generate between 1 and 5 additional reconnects after the first connect
        fc.integer({min: 1, max: 5}),
        (extraReconnects: number) => {
          const client = createMockClient();
          const facade = new RealtimeFacadeImpl({client});

          // First connect
          client._triggerConnected();
          client._triggerDisconnected();

          // Subsequent reconnects
          const subsequentStatuses: RealtimeConnectionStatus[] = [];
          facade.onConnectionStatusChange((status: RealtimeConnectionStatus, _error: FacadeError | null) => {
            subsequentStatuses.push(status);
          });

          for (let i = 0; i < extraReconnects; i++) {
            client._triggerConnected();
            client._triggerDisconnected();
          }

          // Every subsequent onConnected must emit 'reconnecting'
          const reconnectingCount = subsequentStatuses.filter(s => s === 'reconnecting').length;
          expect(reconnectingCount).toBe(extraReconnects);
        },
      ),
      {numRuns: 20},
    );
  });
});
