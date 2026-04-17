import { SetMetadata } from '@nestjs/common';
import { Papel } from '../../../../identidade/domain/value-objects/papel.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Papel[]) => SetMetadata(ROLES_KEY, roles);

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
