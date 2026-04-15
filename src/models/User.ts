/**
 * Supported GovMobile roles used for access control.
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  OFFICER = 'OFFICER',
  CITIZEN = 'CITIZEN',
}

/**
 * Lifecycle status for a GovMobile user account.
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

/**
 * Core user model used across authentication, chat, and calls.
 */
export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  departmentId?: string;
  departmentName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  jobTitle?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}
