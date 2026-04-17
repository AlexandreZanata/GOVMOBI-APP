/**
 * @fileoverview POC coverage for the websocket session hook.
 */
import React from 'react';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import {configureStore} from '@reduxjs/toolkit';
import {Provider} from 'react-redux';
import {Text, Pressable, View} from 'react-native';
import {FacadeProvider} from '@services/facades';
import authReducer, {
  setPapeis,
  setToken,
  setUser,
} from '@store/slices/authSlice';
import corridaReducer from '@store/slices/corridaSlice';
import realtimeReducer from '@store/slices/realtimeSlice';
import {useRealtimeSession} from '../useRealtimeSession';
import {useAppSelector} from '@store/index';
import {UserRole, UserStatus, type User} from '@models/User';
import type {CorridaStatus} from '@models/Corrida';
import type {
  AssinarCorridaPayload,
  AtualizarPosicaoPayload,
  EnviarMensagemPayload,
  HistoricoMensagemPayload,
  RealtimeConnectionStatus,
  RealtimeEvent,
  StatusCorridaAlteradoPayload,
} from '../../types/realtime';
import type {FacadeError, Result} from '@services/facades';
import type {IRealtimeFacade} from '@services/facades/RealtimeFacade';

const buildUser = (): User => ({
  id: 'user-1',
  fullName: 'Realtime Tester',
  email: 'tester@govmobile.local',
  role: UserRole.OFFICER,
  status: UserStatus.ACTIVE,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const ok = <T,>(data: T): Result<T, FacadeError> => ({data, error: null});

class RealtimeFacadeStub implements IRealtimeFacade {
  public connectCalls: string[] = [];
  public subscribedCorridaIds: string[] = [];
  public availableCalls = 0;
  public sentMessages: EnviarMensagemPayload[] = [];
  public positionUpdates: AtualizarPosicaoPayload[] = [];

  private readonly eventHandlers = new Set<(event: RealtimeEvent) => void>();
  private readonly statusHandlers = new Set<
    (status: RealtimeConnectionStatus, error: FacadeError | null) => void
  >();

  /** @inheritdoc */
  public async connect(
    accessToken: string,
  ): Promise<Result<RealtimeConnectionStatus, FacadeError>> {
    this.connectCalls.push(accessToken);
    this.emitStatus('connecting', null);
    return ok('connecting');
  }

  /** @inheritdoc */
  public disconnect(): void {}

  /** @inheritdoc */
  public async subscribeToCorrida(
    payload: AssinarCorridaPayload,
  ): Promise<Result<boolean, FacadeError>> {
    this.subscribedCorridaIds.push(payload.corridaId);
    return ok(true);
  }

  /** @inheritdoc */
  public async setDriverAvailable(): Promise<Result<boolean, FacadeError>> {
    this.availableCalls += 1;
    return ok(true);
  }

  /** @inheritdoc */
  public async updateDriverPosition(
    payload: AtualizarPosicaoPayload,
  ): Promise<Result<boolean, FacadeError>> {
    this.positionUpdates.push(payload);
    return ok(true);
  }

  /** @inheritdoc */
  public async sendCorridaMessage(
    payload: EnviarMensagemPayload,
  ): Promise<Result<boolean, FacadeError>> {
    this.sentMessages.push(payload);
    return ok(true);
  }

  /** @inheritdoc */
  public onEvent(handler: (event: RealtimeEvent) => void): () => void {
    this.eventHandlers.add(handler);
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  /** @inheritdoc */
  public onConnectionStatusChange(
    handler: (
      status: RealtimeConnectionStatus,
      error: FacadeError | null,
    ) => void,
  ): () => void {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  /** @inheritdoc */
  public mapCorridaStatus(status: string): CorridaStatus | null {
    if (status === 'CorridaAceita') return 'ACEITA';
    if (status === 'CorridaConcluida') return 'FINALIZADA';
    return null;
  }

  /** @inheritdoc */
  public normalizeCorridaMensagem(payload: {
    id: string;
    corridaId: string;
    remetenteId: string;
    conteudo: string;
    timestamp: string | number;
  }) {
    return {
      id: payload.id,
      corridaId: payload.corridaId,
      remetenteId: payload.remetenteId,
      conteudo: payload.conteudo,
      createdAt:
        typeof payload.timestamp === 'number'
          ? new Date(payload.timestamp).toISOString()
          : payload.timestamp,
    };
  }

  public emitStatus(
    status: RealtimeConnectionStatus,
    error: FacadeError | null,
  ): void {
    this.statusHandlers.forEach(handler => handler(status, error));
  }

  public emitHistory(payload: HistoricoMensagemPayload[]): void {
    this.eventHandlers.forEach(handler =>
      handler({type: 'historico-mensagens', payload}),
    );
  }

  public emitStatusEvent(payload: StatusCorridaAlteradoPayload): void {
    this.eventHandlers.forEach(handler =>
      handler({type: 'status-corrida-alterado', payload}),
    );
  }

  public emitMensagem(payload: HistoricoMensagemPayload): void {
    this.eventHandlers.forEach(handler =>
      handler({type: 'nova-mensagem', payload}),
    );
  }

  public emitPosicao(): void {
    this.eventHandlers.forEach(handler =>
      handler({
        type: 'posicao-atualizada',
        payload: {
          motoristaId: 'motorista-1',
          lat: -16.68,
          lng: -49.25,
          velocidade: 40,
          heading: 180,
          timestamp: Date.now(),
        },
      }),
    );
  }
}

const createTestStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      corrida: corridaReducer,
      realtime: realtimeReducer,
    },
  });

const Probe = (): React.JSX.Element => {
  const realtime = useRealtimeSession();
  const messagesCount = useAppSelector(state => state.corrida.mensagens.length);
  const status = useAppSelector(
    state => state.corrida.activeCorrida?.status ?? 'NONE',
  );
  const lastEventType = useAppSelector(
    state => state.realtime.lastEventType ?? 'NONE',
  );
  const subscriptionCount = useAppSelector(
    state => state.realtime.subscribedCorridaIds.length,
  );
  const posicaoLat = useAppSelector(
    state => state.corrida.posicaoMotoristaAtual?.lat?.toString() ?? 'NONE',
  );

  return (
    <View>
      <Text testID="connection-status">{realtime.connectionStatus}</Text>
      <Text testID="last-error">{realtime.lastError ?? 'NONE'}</Text>
      <Text testID="messages-count">{messagesCount}</Text>
      <Text testID="corrida-status">{status}</Text>
      <Text testID="last-event-type">{lastEventType}</Text>
      <Text testID="subscription-count">{subscriptionCount}</Text>
      <Text testID="driver-lat">{posicaoLat}</Text>
      <Text testID="can-available">
        {realtime.canDeclareDriverAvailability ? 'yes' : 'no'}
      </Text>
      <Pressable
        testID="subscribe-button"
        onPress={() => {
          void realtime.subscribeToCorrida('corrida-123');
        }}>
        <Text>subscribe</Text>
      </Pressable>
      <Pressable
        testID="available-button"
        onPress={() => {
          void realtime.setDriverAvailable();
        }}>
        <Text>available</Text>
      </Pressable>
      <Pressable
        testID="send-message-button"
        onPress={() => {
          void realtime.sendCorridaMessage({
            corridaId: 'corrida-123',
            conteudo: 'Mensagem de teste',
          });
        }}>
        <Text>send</Text>
      </Pressable>
    </View>
  );
};

describe('useRealtimeSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderProbe = (facade: IRealtimeFacade, motorista = false) => {
    const testStore = createTestStore();

    testStore.dispatch(setUser(buildUser()));
    testStore.dispatch(setToken('jwt-access-token'));
    testStore.dispatch(setPapeis(motorista ? ['MOTORISTA'] : ['USUARIO']));

    const ui = render(
      <Provider store={testStore}>
        <FacadeProvider facades={{realtimeFacade: facade}}>
          <Probe />
        </FacadeProvider>
      </Provider>,
    );

    return {testStore, ...ui};
  };

  it('shows connecting state while websocket handshake is in progress', async () => {
    const facade = new RealtimeFacadeStub();
    const {getByTestId} = renderProbe(facade);

    await waitFor(() => {
      expect(getByTestId('connection-status')).toHaveTextContent('connecting');
    });

    expect(facade.connectCalls).toEqual(['jwt-access-token']);
  });

  it('stores realtime errors from the transport lifecycle', async () => {
    const facade = new RealtimeFacadeStub();
    const {getByTestId} = renderProbe(facade);

    act(() => {
      facade.emitStatus('error', {
        code: 'SOCKET_CONNECT_ERROR',
        message: 'Handshake failed',
      });
    });

    await waitFor(() => {
      expect(getByTestId('connection-status')).toHaveTextContent('error');
      expect(getByTestId('last-error')).toHaveTextContent('Handshake failed');
    });
  });

  it('moves to connected state after a successful socket connect event', async () => {
    const facade = new RealtimeFacadeStub();
    const {getByTestId} = renderProbe(facade);

    act(() => {
      facade.emitStatus('connected', null);
    });

    await waitFor(() => {
      expect(getByTestId('connection-status')).toHaveTextContent('connected');
    });
  });

  it('handles ride-room subscription and inbound realtime events', async () => {
    const facade = new RealtimeFacadeStub();
    const {getByTestId} = renderProbe(facade, true);

    fireEvent.press(getByTestId('subscribe-button'));
    fireEvent.press(getByTestId('available-button'));
    fireEvent.press(getByTestId('send-message-button'));

    act(() => {
      facade.emitHistory([
        {
          id: 'msg-1',
          corridaId: 'corrida-123',
          remetenteId: 'user-a',
          conteudo: 'Historico',
          timestamp: '2026-04-17T10:00:00.000Z',
        },
      ]);
      facade.emitMensagem({
        id: 'msg-2',
        corridaId: 'corrida-123',
        remetenteId: 'user-b',
        conteudo: 'Nova mensagem',
        timestamp: '2026-04-17T10:01:00.000Z',
      });
      facade.emitStatusEvent({
        corridaId: 'corrida-123',
        status: 'CorridaAceita',
      });
      facade.emitPosicao();
    });

    await waitFor(() => {
      expect(getByTestId('subscription-count')).toHaveTextContent('1');
      expect(getByTestId('messages-count')).toHaveTextContent('2');
      expect(getByTestId('last-event-type')).toHaveTextContent(
        'posicao-atualizada',
      );
      expect(getByTestId('driver-lat')).toHaveTextContent('-16.68');
    });

    expect(facade.subscribedCorridaIds).toEqual(['corrida-123']);
    expect(facade.availableCalls).toBe(1);
    expect(facade.sentMessages).toEqual([
      {corridaId: 'corrida-123', conteudo: 'Mensagem de teste'},
    ]);
  });
});
