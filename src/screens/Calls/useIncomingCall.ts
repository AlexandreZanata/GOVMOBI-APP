import {useCallback, useEffect} from 'react';
import {
  CallStatus,
  CallType,
  type Call,
  type CallParticipant,
} from '../../models';
import {useAppDispatch, useAppSelector} from '../../store';
import {
  addCallToHistory,
  clearCall,
  setActiveCall,
  setIncomingCall,
} from '@store/slices/callsSlice';

export interface IncomingCallState {
  incomingCall: Call | null;
  callerName: string;
  callerDepartment: string;
  onAnswer: () => void;
  onDecline: () => void;
}

const MOCK_CALLER: CallParticipant = {
  id: 'cp-mock-001',
  userId: 'user-002',
  callId: 'call-incoming-001',
  displayName: 'Carlos Mendes',
  departmentName: 'Field Operations',
  createdAt: '2024-01-15T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
};

const MOCK_INCOMING_CALL: Call = {
  id: 'call-incoming-001',
  type: CallType.VOICE,
  status: CallStatus.INCOMING,
  initiatorId: 'user-002',
  participants: [
    MOCK_CALLER,
    {
      id: 'cp-mock-002',
      userId: 'user-001',
      callId: 'call-incoming-001',
      displayName: 'Ana Silva',
      departmentName: 'Field Operations',
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Encapsulates all state and logic for the IncomingCall screen.
 *
 * Simulates a WebSocket-delivered incoming call signal after 3 seconds (POC).
 * Exposes answer and decline handlers that update the Redux calls slice.
 *
 * @returns {@link IncomingCallState}
 */
export const useIncomingCall = (): IncomingCallState => {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(state => state.auth.user?.id ?? 'user-001');
  const incomingCall = useAppSelector(state => state.calls.incomingCall);

  // Simulate incoming call signal after 3s (replaces WebSocket in POC)
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(setIncomingCall(MOCK_INCOMING_CALL));
    }, 3000);
    return () => clearTimeout(timer);
  }, [dispatch]);

  const caller = incomingCall?.participants.find(
    (p: CallParticipant) => p.userId !== currentUserId,
  );

  /**
   * Answers the incoming call.
   * Transitions the call to ACTIVE status and navigates to ActiveCallScreen.
   */
  const onAnswer = useCallback((): void => {
    if (!incomingCall) return;
    const activeCall: Call = {
      ...incomingCall,
      status: CallStatus.ACTIVE,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch(setActiveCall(activeCall));
    dispatch(setIncomingCall(null));
  }, [dispatch, incomingCall]);

  /**
   * Declines the incoming call.
   * Logs the call as missed in history and clears the incoming call state.
   */
  const onDecline = useCallback((): void => {
    if (!incomingCall) return;
    const missedCall: Call = {
      ...incomingCall,
      status: CallStatus.MISSED,
      updatedAt: new Date().toISOString(),
    };
    dispatch(addCallToHistory(missedCall));
    dispatch(clearCall());
  }, [dispatch, incomingCall]);

  return {
    incomingCall,
    callerName: caller?.displayName ?? '',
    callerDepartment: caller?.departmentName ?? '',
    onAnswer,
    onDecline,
  };
};
