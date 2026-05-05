import {useCallback, useEffect, useRef, useState} from 'react';
import {CallStatus, type Call, type CallParticipant} from '../../models';
import {useAppDispatch, useAppSelector} from '../../store';
import {addCallToHistory, clearCall} from '@store/slices/callsSlice';
import {formatDuration} from '@utils/formatDuration';

export interface ActiveCallState {
  activeCall: Call | null;
  callerName: string;
  callerDepartment: string;
  durationLabel: string;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isOnHold: boolean;
  isVideoOn: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onToggleHold: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
}

/**
 * Encapsulates all state and logic for the ActiveCall screen.
 *
 * Manages a counting-up duration timer, call control toggles (mute, speaker,
 * hold, video), and the end-call flow that logs the call to history.
 *
 * @returns {@link ActiveCallState}
 */
export const useActiveCall = (): ActiveCallState => {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector(state => state.auth.user?.id ?? 'user-001');
  const activeCall = useAppSelector(state => state.calls.activeCall);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start duration timer when call is active
  useEffect(() => {
    if (!activeCall) return;
    intervalRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeCall]);

  const caller = activeCall?.participants.find(
    (p: CallParticipant) => p.userId !== currentUserId,
  );

  const onToggleMute = useCallback((): void => setIsMuted(prev => !prev), []);
  const onToggleSpeaker = useCallback((): void => setIsSpeakerOn(prev => !prev), []);
  const onToggleHold = useCallback((): void => setIsOnHold(prev => !prev), []);
  const onToggleVideo = useCallback((): void => setIsVideoOn(prev => !prev), []);

  /**
   * Ends the active call, logs it to history, and clears call state.
   */
  const onEndCall = useCallback((): void => {
    if (!activeCall) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    const endedCall: Call = {
      ...activeCall,
      status: CallStatus.ENDED,
      endedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      duration: {
        id: `dur-${Date.now()}`,
        totalSeconds: elapsedSeconds,
        startedAt: activeCall.startedAt,
        endedAt: new Date().toISOString(),
        createdAt: activeCall.createdAt,
        updatedAt: new Date().toISOString(),
      },
    };
    dispatch(addCallToHistory(endedCall));
    dispatch(clearCall());
  }, [activeCall, dispatch, elapsedSeconds]);

  return {
    activeCall,
    callerName: caller?.displayName ?? '',
    callerDepartment: caller?.departmentName ?? '',
    durationLabel: formatDuration(elapsedSeconds),
    isMuted,
    isSpeakerOn,
    isOnHold,
    isVideoOn,
    onToggleMute,
    onToggleSpeaker,
    onToggleHold,
    onToggleVideo,
    onEndCall,
  };
};
