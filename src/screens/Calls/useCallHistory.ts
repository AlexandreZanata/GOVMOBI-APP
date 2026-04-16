import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  CallStatus,
  type Call,
  type CallParticipant,
} from '../../models';
import {useAppDispatch, useAppSelector} from '../../store';
import {setCallHistory} from '@store/slices/callsSlice';
import {useFacades} from '../../services/facades';

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
  const {callFacade} = useFacades();
  const currentUserId = useAppSelector(state => state.auth.user?.id ?? '');
  const callHistory = useAppSelector(state => state.calls.callHistory);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<CallFilter>('all');

  const fetchCalls = useCallback(async (): Promise<void> => {
    const result = await callFacade.getCallHistory(1);
    if (result.data) {
      dispatch(setCallHistory(result.data));
    }
  }, [callFacade, dispatch]);

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
