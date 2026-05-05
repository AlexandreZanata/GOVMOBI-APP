/**
 * @fileoverview Shared domain interfaces for dispatcher-agent calls.
 */

/**
 * Voice/video modality supported by call sessions.
 */
export type CallType = 'VOICE' | 'VIDEO';

/**
 * Runtime state of a call session.
 */
export type CallStatus =
  | 'INCOMING'
  | 'OUTGOING'
  | 'MISSED'
  | 'ACTIVE'
  | 'ENDED';

/**
 * Participant metadata for call sessions.
 */
export interface CallParticipant {
  id: string;
  userId: string;
  displayName: string;
  joinedAt?: string;
  leftAt?: string;
  isMuted?: boolean;
}

/**
 * Call duration metadata used in history records.
 */
export interface CallDuration {
  totalSeconds: number;
  startedAt?: string;
  endedAt?: string;
}

/**
 * Call aggregate contract shared by API and mock services.
 */
export interface Call {
  id: string;
  runId?: string;
  type: CallType;
  status: CallStatus;
  initiatorId: string;
  participants: CallParticipant[];
  duration?: CallDuration;
  createdAt: string;
  updatedAt: string;
}
