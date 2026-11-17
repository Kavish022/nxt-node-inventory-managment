import { Permission, Role, RolePermission, User } from '@prisma/client';
import { PermissionKey } from '../../constants/permissions';
import { AuthUserPayload, PublicUser } from '../../types/auth.types';

type UserWithRole = User & {
  role: Role & {
    permissions: Array<RolePermission & { permission: Permission }>;
  };
};

export function toAuthUser(user: UserWithRole): AuthUserPayload {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    accountStatus: user.accountStatus,
    role: user.role.name,
    permissions: user.role.permissions.map((item) => item.permission.key as PermissionKey),
  };
}

export function toPublicUser(user: UserWithRole): PublicUser {
  return {
    ...toAuthUser(user),
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}
