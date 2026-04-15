/**
 * Communication mode for a call session.
 */
export enum CallType {
  VOICE = 'VOICE',
  VIDEO = 'VIDEO',
}

/**
 * Current state of a call in its full lifecycle.
 */
export enum CallStatus {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
  MISSED = 'MISSED',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
}

/**
 * Duration payload for persisted call history entries.
 */
export interface CallDuration {
  id: string;
  totalSeconds: number;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Participant metadata associated with a call.
 */
export interface CallParticipant {
  id: string;
  userId: string;
  callId: string;
  displayName: string;
  departmentId?: string;
  departmentName?: string;
  joinedAt?: string;
  leftAt?: string;
  isMuted?: boolean;
  hasVideoEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Call aggregate model used for active and historical sessions.
 */
export interface Call {
  id: string;
  type: CallType;
  status: CallStatus;
  initiatorId: string;
  participants: CallParticipant[];
  duration?: CallDuration;
  startedAt?: string;
  endedAt?: string;
  missedReason?: string;
  createdAt: string;
  updatedAt: string;
}
