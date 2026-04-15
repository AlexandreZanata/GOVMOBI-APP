import {z} from 'zod';
import {
  CallStatus,
  CallType,
  MessageStatus,
  MessageType,
  NotificationPriority,
  NotificationType,
  UserRole,
  UserStatus,
  type Call,
  type Conversation,
  type Department,
  type Message,
  type Notification,
  type User,
} from '../index';

const isoDateTimeSchema = z.string().datetime({offset: true});
const uuidSchema = z.string().uuid();

const userSchema = z.object({
  id: uuidSchema,
  fullName: z.string().min(1),
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus),
  departmentId: uuidSchema.optional(),
  departmentName: z.string().optional(),
  phoneNumber: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  jobTitle: z.string().optional(),
  lastLoginAt: isoDateTimeSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const conversationParticipantSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  conversationId: uuidSchema,
  role: z.enum(['OWNER', 'MEMBER']),
  displayName: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  isOnline: z.boolean().optional(),
  lastReadMessageId: uuidSchema.optional(),
  joinedAt: isoDateTimeSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const conversationSchema = z.object({
  id: uuidSchema,
  title: z.string().optional(),
  description: z.string().optional(),
  isGroup: z.boolean(),
  participants: z.array(conversationParticipantSchema),
  lastMessageId: uuidSchema.optional(),
  unreadCount: z.number().int().nonnegative().optional(),
  muted: z.boolean().optional(),
  archived: z.boolean().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const messageSchema = z.object({
  id: uuidSchema,
  conversationId: uuidSchema,
  senderId: uuidSchema,
  type: z.nativeEnum(MessageType),
  status: z.nativeEnum(MessageStatus),
  content: z.string(),
  attachmentUrl: z.string().url().optional(),
  attachmentName: z.string().optional(),
  attachmentMimeType: z.string().optional(),
  attachmentSizeBytes: z.number().int().nonnegative().optional(),
  replyToMessageId: uuidSchema.optional(),
  readAt: isoDateTimeSchema.optional(),
  deliveredAt: isoDateTimeSchema.optional(),
  failedReason: z.string().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const callParticipantSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  callId: uuidSchema,
  displayName: z.string().min(1),
  departmentId: uuidSchema.optional(),
  departmentName: z.string().optional(),
  joinedAt: isoDateTimeSchema.optional(),
  leftAt: isoDateTimeSchema.optional(),
  isMuted: z.boolean().optional(),
  hasVideoEnabled: z.boolean().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const callDurationSchema = z.object({
  id: uuidSchema,
  totalSeconds: z.number().int().nonnegative(),
  startedAt: isoDateTimeSchema.optional(),
  endedAt: isoDateTimeSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const callSchema = z.object({
  id: uuidSchema,
  type: z.nativeEnum(CallType),
  status: z.nativeEnum(CallStatus),
  initiatorId: uuidSchema,
  participants: z.array(callParticipantSchema),
  duration: callDurationSchema.optional(),
  startedAt: isoDateTimeSchema.optional(),
  endedAt: isoDateTimeSchema.optional(),
  missedReason: z.string().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const notificationSchema = z.object({
  id: uuidSchema,
  type: z.nativeEnum(NotificationType),
  priority: z.nativeEnum(NotificationPriority),
  title: z.string().min(1),
  body: z.string().min(1),
  userId: uuidSchema,
  isRead: z.boolean(),
  actionUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  readAt: isoDateTimeSchema.optional(),
  expiresAt: isoDateTimeSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const serviceCategorySchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  iconName: z.string().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const serviceSchema = z.object({
  id: uuidSchema,
  departmentId: uuidSchema,
  categoryId: uuidSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  isActive: z.boolean(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const departmentSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
  managerUserId: uuidSchema.optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  services: z.array(serviceSchema).optional(),
  categories: z.array(serviceCategorySchema).optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

describe('models', () => {
  it('compile with strict typing and no any usage', () => {
    const userSample: User = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      fullName: 'Maria Silva',
      email: 'maria.silva@gov.example',
      role: UserRole.OFFICER,
      status: UserStatus.ACTIVE,
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
    };

    const conversationSample: Conversation = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      isGroup: false,
      participants: [
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          userId: userSample.id,
          conversationId: '123e4567-e89b-12d3-a456-426614174001',
          role: 'MEMBER',
          displayName: userSample.fullName,
          createdAt: '2026-01-01T12:00:00.000Z',
          updatedAt: '2026-01-01T12:00:00.000Z',
        },
      ],
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
    };

    const messageSample: Message = {
      id: '123e4567-e89b-12d3-a456-426614174003',
      conversationId: conversationSample.id,
      senderId: userSample.id,
      type: MessageType.TEXT,
      status: MessageStatus.SENT,
      content: 'Message body',
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
    };

    const callSample: Call = {
      id: '123e4567-e89b-12d3-a456-426614174004',
      type: CallType.VOICE,
      status: CallStatus.ENDED,
      initiatorId: userSample.id,
      participants: [
        {
          id: '123e4567-e89b-12d3-a456-426614174005',
          userId: userSample.id,
          callId: '123e4567-e89b-12d3-a456-426614174004',
          displayName: userSample.fullName,
          createdAt: '2026-01-01T12:00:00.000Z',
          updatedAt: '2026-01-01T12:00:00.000Z',
        },
      ],
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
    };

    const notificationSample: Notification = {
      id: '123e4567-e89b-12d3-a456-426614174006',
      type: NotificationType.SYSTEM,
      priority: NotificationPriority.MEDIUM,
      title: 'System maintenance',
      body: 'Scheduled update tonight.',
      userId: userSample.id,
      isRead: false,
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
    };

    const departmentSample: Department = {
      id: '123e4567-e89b-12d3-a456-426614174007',
      name: 'Public Works',
      code: 'PW-001',
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
    };

    expect(userSample.id).toBeTruthy();
    expect(conversationSample.participants).toHaveLength(1);
    expect(messageSample.type).toBe(MessageType.TEXT);
    expect(callSample.status).toBe(CallStatus.ENDED);
    expect(notificationSample.priority).toBe(NotificationPriority.MEDIUM);
    expect(departmentSample.code).toBe('PW-001');
  });

  it('validates model shapes with zod schemas', () => {
    const baseIso = '2026-01-01T12:00:00.000Z';

    const parsedUser = userSchema.parse({
      id: '123e4567-e89b-12d3-a456-426614174100',
      fullName: 'Lucas Pereira',
      email: 'lucas.pereira@gov.example',
      role: UserRole.MANAGER,
      status: UserStatus.ACTIVE,
      createdAt: baseIso,
      updatedAt: baseIso,
    });

    const parsedConversation = conversationSchema.parse({
      id: '123e4567-e89b-12d3-a456-426614174101',
      isGroup: true,
      participants: [
        {
          id: '123e4567-e89b-12d3-a456-426614174102',
          userId: parsedUser.id,
          conversationId: '123e4567-e89b-12d3-a456-426614174101',
          role: 'OWNER',
          displayName: parsedUser.fullName,
          createdAt: baseIso,
          updatedAt: baseIso,
        },
      ],
      createdAt: baseIso,
      updatedAt: baseIso,
    });

    const parsedMessage = messageSchema.parse({
      id: '123e4567-e89b-12d3-a456-426614174103',
      conversationId: parsedConversation.id,
      senderId: parsedUser.id,
      type: MessageType.TEXT,
      status: MessageStatus.DELIVERED,
      content: 'Validated message',
      createdAt: baseIso,
      updatedAt: baseIso,
    });

    const parsedCall = callSchema.parse({
      id: '123e4567-e89b-12d3-a456-426614174104',
      type: CallType.VIDEO,
      status: CallStatus.ACTIVE,
      initiatorId: parsedUser.id,
      participants: [
        {
          id: '123e4567-e89b-12d3-a456-426614174105',
          userId: parsedUser.id,
          callId: '123e4567-e89b-12d3-a456-426614174104',
          displayName: parsedUser.fullName,
          createdAt: baseIso,
          updatedAt: baseIso,
        },
      ],
      createdAt: baseIso,
      updatedAt: baseIso,
    });

    const parsedNotification = notificationSchema.parse({
      id: '123e4567-e89b-12d3-a456-426614174106',
      type: NotificationType.ANNOUNCEMENT,
      priority: NotificationPriority.HIGH,
      title: 'New internal policy',
      body: 'Please review the policy update.',
      userId: parsedUser.id,
      isRead: false,
      createdAt: baseIso,
      updatedAt: baseIso,
    });

    const parsedDepartment = departmentSchema.parse({
      id: '123e4567-e89b-12d3-a456-426614174107',
      name: 'Citizen Services',
      code: 'CS-100',
      services: [
        {
          id: '123e4567-e89b-12d3-a456-426614174108',
          departmentId: '123e4567-e89b-12d3-a456-426614174107',
          categoryId: '123e4567-e89b-12d3-a456-426614174109',
          name: 'Permit Request',
          description: 'Submit permit applications',
          isActive: true,
          createdAt: baseIso,
          updatedAt: baseIso,
        },
      ],
      categories: [
        {
          id: '123e4567-e89b-12d3-a456-426614174109',
          name: 'Civil Services',
          createdAt: baseIso,
          updatedAt: baseIso,
        },
      ],
      createdAt: baseIso,
      updatedAt: baseIso,
    });

    expect(parsedUser.role).toBe(UserRole.MANAGER);
    expect(parsedConversation.isGroup).toBe(true);
    expect(parsedMessage.status).toBe(MessageStatus.DELIVERED);
    expect(parsedCall.type).toBe(CallType.VIDEO);
    expect(parsedNotification.type).toBe(NotificationType.ANNOUNCEMENT);
    expect(parsedDepartment.services).toHaveLength(1);
  });
});
