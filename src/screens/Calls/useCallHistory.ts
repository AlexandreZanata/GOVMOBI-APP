import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  CallStatus,
  CallType,
  type Call,
  type CallParticipant,
} from '../../models';
import {useAppDispatch, useAppSelector} from '../../store';
import {setCallHistory} from '@store/slices/callsSlice';

export type CallFilter = 'all' | 'incoming' | 'outgoing' | 'missed';

export interface CallHistoryRow {
  call: Call;
  displayName: string;
  departmentName?: string;
}

export interface CallHistoryState {
  rows: CallHistoryRow[];
  isLoading: boolean;
  isRefreshing: boolean;
  activeFilter: CallFilter;
  onFilterChange: (filter: CallFilter) => void;
  onRefresh: () => void;
  onCallBack: () => void;
  onDelete: (call: Call) => void;
}

const MOCK_CURRENT_USER_ID = 'user-001';

const buildMockCalls = (): Call[] => {
  const makeParticipant = (
    id: string,
    userId: string,
    callId: string,
    displayName: string,
    departmentName: string,
  ): CallParticipant => ({
    id,
    userId,
    callId,
    displayName,
    departmentName,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  });

  return [
    {
      id: 'call-001',
      type: CallType.VOICE,
      status: CallStatus.MISSED,
      initiatorId: 'user-002',
      participants: [
        makeParticipant('cp-001', 'user-002', 'call-001', 'Carlos Mendes', 'Field Operations'),
        makeParticipant('cp-002', MOCK_CURRENT_USER_ID, 'call-001', 'Ana Silva', 'Field Operations'),
      ],
      createdAt: '2024-01-15T09:00:00Z',
      updatedAt: '2024-01-15T09:00:00Z',
    },
    {
      id: 'call-002',
      type: CallType.VOICE,
      status: CallStatus.ENDED,
      initiatorId: MOCK_CURRENT_USER_ID,
      participants: [
        makeParticipant('cp-003', MOCK_CURRENT_USER_ID, 'call-002', 'Ana Silva', 'Field Operations'),
        makeParticipant('cp-004', 'user-003', 'call-002', 'Maria Santos', 'Administration'),
      ],
      duration: {
        id: 'dur-001',
        totalSeconds: 183,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:03:03Z',
      },
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:03:03Z',
    },
    {
      id: 'call-003',
      type: CallType.VIDEO,
      status: CallStatus.ENDED,
      initiatorId: 'user-004',
      participants: [
        makeParticipant('cp-005', 'user-004', 'call-003', 'Roberto Lima', 'Command'),
        makeParticipant('cp-006', MOCK_CURRENT_USER_ID, 'call-003', 'Ana Silva', 'Field Operations'),
      ],
      duration: {
        id: 'dur-002',
        totalSeconds: 540,
        createdAt: '2024-01-14T14:00:00Z',
        updatedAt: '2024-01-14T14:09:00Z',
      },
      createdAt: '2024-01-14T14:00:00Z',
      updatedAt: '2024-01-14T14:09:00Z',
    },
    {
      id: 'call-004',
      type: CallType.VOICE,
      status: CallStatus.MISSED,
      initiatorId: 'user-005',
      participants: [
        makeParticipant('cp-007', 'user-005', 'call-004', 'Lucia Ferreira', 'Logistics'),
        makeParticipant('cp-008', MOCK_CURRENT_USER_ID, 'call-004', 'Ana Silva', 'Field Operations'),
      ],
      createdAt: '2024-01-14T08:30:00Z',
      updatedAt: '2024-01-14T08:30:00Z',
    },
  ];
};

const resolveRow = (call: Call, currentUserId: string): CallHistoryRow => {
  const other = call.participants.find(
    (p: CallParticipant) => p.userId !== currentUserId,
  );
  return {
    call,
    displayName: other?.displayName ?? 'Unknown',
    departmentName: other?.departmentName,
  };
};

const filterMatches = (call: Call, filter: CallFilter, currentUserId: string): boolean => {
  if (filter === 'all') return true;
  if (filter === 'missed') return call.status === CallStatus.MISSED;
  if (filter === 'incoming') return call.initiatorId !== currentUserId;
  if (filter === 'outgoing') return call.initiatorId === currentUserId;
  return true;
};

/**
 * Encapsulates all state and logic for the CallHistory screen.
 *
 * @returns {@link CallHistoryState}
 */
export const useCallHistory = (): CallHistoryState => {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(state => state.auth.user?.id ?? MOCK_CURRENT_USER_ID);
  const callHistory = useAppSelector(state => state.calls.callHistory);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<CallFilter>('all');

  const fetchCalls = useCallback(async (): Promise<void> => {
    await new Promise<void>(resolve => setTimeout(resolve, 500));
    dispatch(setCallHistory(buildMockCalls()));
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      await fetchCalls();
      if (!cancelled) setIsLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [fetchCalls]);

  const onRefresh = useCallback((): void => {
    setIsRefreshing(true);
    fetchCalls().then(() => setIsRefreshing(false));
  }, [fetchCalls]);

  const onFilterChange = useCallback((filter: CallFilter): void => {
    setActiveFilter(filter);
  }, []);

  const onCallBack = useCallback((): void => {
    // TODO: integrate CallFacade.initiateCall() in Step 6
  }, []);

  const onDelete = useCallback((call: Call): void => {
    const remaining = callHistory.filter(c => c.id !== call.id);
    dispatch(setCallHistory(remaining));
  }, [callHistory, dispatch]);

  const rows = useMemo<CallHistoryRow[]>(
    () =>
      callHistory
        .filter(c => filterMatches(c, activeFilter, currentUserId))
        .map(c => resolveRow(c, currentUserId)),
    [callHistory, activeFilter, currentUserId],
  );

  return {rows, isLoading, isRefreshing, activeFilter, onFilterChange, onRefresh, onCallBack, onDelete};
};
