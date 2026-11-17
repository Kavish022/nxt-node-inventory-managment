import { RoleName, UserAccountStatus } from '@prisma/client';
import { PermissionKey } from '../constants/permissions';

export interface AuthUserPayload {
  id: number;
  email: string;
  name: string;
  accountStatus: UserAccountStatus;
  role: RoleName;
  permissions: PermissionKey[];
}

export interface PublicUser {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  accountStatus: UserAccountStatus;
  role: RoleName;
  permissions: PermissionKey[];
  createdAt: Date;
}
