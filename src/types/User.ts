/**
 * @fileoverview Shared domain interfaces for users and roles.
 */

/**
 * Roles supported by GovMobile operations.
 */
export type UserRole = 'AGENT' | 'DISPATCHER' | 'SUPERVISOR' | 'ADMIN';

/**
 * User account status lifecycle.
 */
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';

/**
 * Shared user contract used by mock and API service layers.
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
  createdAt: string;
  updatedAt: string;
}
