import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '@prisma/client';

export const ADMIN_ROLES_KEY = 'ri:admin-roles';
export const PROFESSIONAL_SCOPE_PARAM_KEY = 'ri:professional-scope-param';

export const AdminRoles = (...roles: AdminRole[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);

export const ProfessionalScope = (routeParam = 'professionalId') =>
  SetMetadata(PROFESSIONAL_SCOPE_PARAM_KEY, routeParam);
