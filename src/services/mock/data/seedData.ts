/**
 * @fileoverview Seed data generators for backend simulation mode.
 */
import type {Call, Conversation, Message, Run, User} from '../../../types';

const NOW = new Date('2026-01-10T10:00:00.000Z').toISOString();

/**
 * Creates baseline users for the mock environment.
 *
 * @returns Deterministic list of users for all operational roles.
 */
export const createSeedUsers = (): User[] => [
  {
    id: 'user-agent-001',
    fullName: 'Ana Silva',
    email: 'ana.silva@govmobile.gov',
    role: 'AGENT',
    status: 'ACTIVE',
    departmentId: 'dep-field-1',
    departmentName: 'Field Operations',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'user-dispatch-001',
    fullName: 'Carlos Pereira',
    email: 'carlos.pereira@govmobile.gov',
    role: 'DISPATCHER',
    status: 'ACTIVE',
    departmentId: 'dep-control-1',
    departmentName: 'Dispatch Control',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'user-supervisor-001',
    fullName: 'Marina Costa',
    email: 'marina.costa@govmobile.gov',
    role: 'SUPERVISOR',
    status: 'ACTIVE',
    departmentId: 'dep-control-1',
    departmentName: 'Dispatch Control',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'user-admin-001',
    fullName: 'Paulo Nascimento',
    email: 'paulo.nascimento@govmobile.gov',
    role: 'ADMIN',
    status: 'ACTIVE',
    departmentId: 'dep-admin-1',
    departmentName: 'Administration',
    createdAt: NOW,
    updatedAt: NOW,
  },
];

/**
 * Creates baseline run entities for operational simulation.
 *
 * @returns Deterministic run list with mixed statuses.
 */
export const createSeedRuns = (): Run[] => [
  {
    id: 'run-001',
    title: 'Hospital Document Delivery',
    description: 'Deliver signed documents to municipal hospital.',
    type: 'ADMINISTRATIVE_DELIVERY',
    priority: 'MEDIUM',
    status: 'ASSIGNED',
    location: {
      address: 'Avenida Central 1200',
      latitude: -23.55052,
      longitude: -46.633308,
    },
    assignment: {
      dispatcherId: 'user-dispatch-001',
      agentId: 'user-agent-001',
      assignedAt: NOW,
    },
    proofs: [],
    timeline: [],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'run-002',
    title: 'Bridge Inspection',
    description: 'Inspect bridge structural points and report anomalies.',
    type: 'INSPECTION',
    priority: 'HIGH',
    status: 'PENDING',
    location: {
      address: 'Rua das Palmeiras 48',
      latitude: -23.554,
      longitude: -46.635,
    },
    proofs: [],
    timeline: [],
    createdAt: NOW,
    updatedAt: NOW,
  },
];

/**
 * Creates baseline conversations for dispatcher-agent communication.
 *
 * @returns Deterministic conversation list.
 */
export const createSeedConversations = (): Conversation[] => [
  {
    id: 'conv-001',
    title: 'Dispatch - Sector 7',
    runId: 'run-001',
    participants: [
      {
        id: 'participant-1',
        userId: 'user-dispatch-001',
        displayName: 'Carlos Pereira',
        isOnline: true,
        joinedAt: NOW,
      },
      {
        id: 'participant-2',
        userId: 'user-agent-001',
        displayName: 'Ana Silva',
        isOnline: true,
        joinedAt: NOW,
      },
    ],
    unreadCount: 1,
    lastMessageId: 'msg-001',
    createdAt: NOW,
    updatedAt: NOW,
  },
];

/**
 * Creates baseline chat messages for mock communication streams.
 *
 * @returns Deterministic message list.
 */
export const createSeedMessages = (): Message[] => [
  {
    id: 'msg-001',
    conversationId: 'conv-001',
    runId: 'run-001',
    senderId: 'user-dispatch-001',
    type: 'TEXT',
    status: 'SENT',
    content: 'Agent, please confirm departure to the hospital.',
    createdAt: NOW,
    updatedAt: NOW,
  },
];

/**
 * Creates baseline call history entries.
 *
 * @returns Deterministic call list.
 */
export const createSeedCalls = (): Call[] => [
  {
    id: 'call-001',
    runId: 'run-001',
    type: 'VOICE',
    status: 'MISSED',
    initiatorId: 'user-dispatch-001',
    participants: [
      {
        id: 'call-participant-1',
        userId: 'user-dispatch-001',
        displayName: 'Carlos Pereira',
      },
      {
        id: 'call-participant-2',
        userId: 'user-agent-001',
        displayName: 'Ana Silva',
      },
    ],
    duration: {
      totalSeconds: 0,
    },
    createdAt: NOW,
    updatedAt: NOW,
  },
];
