/**
 * @fileoverview Shared domain interfaces for operational runs.
 */

/**
 * Supported task categories handled by field operations.
 */
export type RunType =
  | 'TRANSPORT'
  | 'INSPECTION'
  | 'EMERGENCY_DISPATCH'
  | 'MAINTENANCE'
  | 'ADMINISTRATIVE_DELIVERY';

/**
 * Priority level for dispatch queue ordering.
 */
export type RunPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Valid run lifecycle states.
 */
export type RunStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

/**
 * Run location details used by dispatch and map tracking.
 */
export interface RunLocation {
  address: string;
  latitude: number;
  longitude: number;
}

/**
 * Assignment metadata linking dispatcher and agent.
 */
export interface RunAssignment {
  dispatcherId: string;
  agentId: string;
  assignedAt: string;
  acceptedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

/**
 * Completion proof payload attached by field agents.
 */
export interface RunProof {
  id: string;
  runId: string;
  type: 'PHOTO' | 'DOCUMENT';
  uri: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
}

/**
 * Timeline event for state transitions and supervisor actions.
 */
export interface RunTimelineEvent {
  id: string;
  runId: string;
  fromStatus: RunStatus | null;
  toStatus: RunStatus;
  actorId: string;
  note?: string;
  occurredAt: string;
}

/**
 * Primary run aggregate shared by API and mock services.
 */
export interface Run {
  id: string;
  title: string;
  description: string;
  type: RunType;
  priority: RunPriority;
  status: RunStatus;
  location: RunLocation;
  assignment?: RunAssignment;
  proofs: RunProof[];
  timeline: RunTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Input contract for creating a new run.
 */
export interface CreateRunInput {
  title: string;
  description: string;
  type: RunType;
  priority: RunPriority;
  location: RunLocation;
}
