/**
 * @fileoverview Module implementation for models/Department.
 */
/**
 * Service grouping used by departments for catalog organization.
 */
export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  iconName?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Public service item provided by a department.
 */
export interface Service {
  id: string;
  departmentId: string;
  categoryId: string;
  name: string;
  description: string;
  isActive: boolean;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Organizational department model used across users and services.
 */
export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  managerUserId?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  services?: Service[];
  categories?: ServiceCategory[];
  createdAt: string;
  updatedAt: string;
}
