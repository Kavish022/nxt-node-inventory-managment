import { NextFunction, Request, Response } from 'express';
import { CookieNames } from '../constants/cookies';
import { PermissionKey } from '../constants/permissions';
import { ForbiddenError, UnauthorizedError } from '../utils/apiError';
import { verifyAccessToken } from '../utils/jwt.utils';
import { AuthRepository } from '../modules/auth/auth.repository';
import { toAuthUser } from '../modules/auth/auth.mapper';

function extractAccessToken(req: Request): string | undefined {
  const cookieToken = req.cookies?.[CookieNames.ACCESS_TOKEN] as string | undefined;
  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length);
  }

  return undefined;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractAccessToken(req);
    if (!token) {
      throw new UnauthorizedError('Authentication token missing');
    }

    const payload = verifyAccessToken(token);
    const user = await AuthRepository.findByIdWithRole(payload.id);

    if (!user || user.deletedAt) {
      throw new UnauthorizedError('User account is no longer available');
    }

    if (user.accountStatus !== 'ACTIVE') {
      throw new ForbiddenError('Your account has been suspended or deactivated');
    }

    req.user = toAuthUser(user);
    next();
  } catch (error) {
    next(error);
  }
}

export function requirePermission(...required: PermissionKey[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    const hasAll = required.every((permission) => req.user?.permissions.includes(permission));
    if (!hasAll) {
      next(new ForbiddenError('You do not have permission to perform this action'));
      return;
    }

    next();
  };
}
