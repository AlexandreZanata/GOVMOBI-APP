/**
 * @fileoverview Bug condition exploration tests for RealtimeFacade.
 *
 * These tests encode EXPECTED (correct) behavior and MUST FAIL on unfixed code.
 * Failure confirms the bugs exist. Do NOT fix the source code when these fail.
 *
 * Bug 1: First onConnected emits 'reconnecting' instead of 'connected'
 *
 * Validates: Requirements 1.2, 2.2
 * Bug_Condition: isBugCondition_InfiniteReconnect(X) where X.wasEverConnected = false
 * Expected_Behavior (Property 1): emitted_status = 'connected'
 */

import {RealtimeFacadeImpl} from '../RealtimeFacade';
import type {IDespachoWebSocketClient} from '@services/websocket';
import type {RealtimeConnectionStatus} from '../../../types/realtime';
import type {FacadeError} from '../types';

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
