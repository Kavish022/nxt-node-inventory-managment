import crypto from 'crypto';
import { RoleName } from '@prisma/client';
import { env } from '../../config/env';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../utils/apiError';
import { comparePassword, hashPassword } from '../../utils/password.utils';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt.utils';
import { toPublicUser } from './auth.mapper';
import { AuthRepository } from './auth.repository';
import {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from './auth.validation';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function tokenPair(userId: number, email: string) {
  return {
    accessToken: generateAccessToken({ id: userId, email }),
    refreshToken: generateRefreshToken({ id: userId, email }),
  };
}

export class AuthService {
  static async register(input: RegisterInput) {
    if (!env.ALLOW_PUBLIC_REGISTER) {
      throw new ForbiddenError('Public registration is disabled');
    }

    const existing = await AuthRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }

    const viewerRole = await AuthRepository.findRoleByName(RoleName.VIEWER);
    if (!viewerRole) {
      throw new Error('Viewer role is missing. Run database seeds.');
    }

    const user = await AuthRepository.createUser({
      email: input.email,
      name: input.name,
      passwordHash: await hashPassword(input.password),
      role: { connect: { id: viewerRole.id } },
    });

    const tokens = tokenPair(user.id, user.email);
    await AuthRepository.saveRefreshToken(user.id, tokens.refreshToken, new Date(Date.now() + REFRESH_TTL_MS));

    return { user: toPublicUser(user), tokens };
  }

  static async login(input: LoginInput) {
    const user = await AuthRepository.findByEmail(input.email);
    if (!user || user.deletedAt) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.accountStatus !== 'ACTIVE') {
      throw new ForbiddenError('Your account has been suspended or deactivated');
    }

    const isMatch = await comparePassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    await AuthRepository.updateLastLogin(user.id);
    const tokens = tokenPair(user.id, user.email);
    await AuthRepository.saveRefreshToken(user.id, tokens.refreshToken, new Date(Date.now() + REFRESH_TTL_MS));

    return { user: toPublicUser(user), tokens };
  }

  static async refresh(oldRefreshToken: string) {
    const payload = verifyRefreshToken(oldRefreshToken);
    const tokenRecord = await AuthRepository.findRefreshToken(oldRefreshToken);

    if (
      !tokenRecord ||
      tokenRecord.userId !== payload.id ||
      tokenRecord.revoked ||
      tokenRecord.expiresAt < new Date()
    ) {
      throw new UnauthorizedError('Refresh token is invalid, revoked, or expired');
    }

    const user = tokenRecord.user;
    if (!user || user.deletedAt || user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedError('User account is inactive or deleted');
    }

    await AuthRepository.revokeRefreshToken(oldRefreshToken);
    const tokens = tokenPair(user.id, user.email);
    await AuthRepository.saveRefreshToken(user.id, tokens.refreshToken, new Date(Date.now() + REFRESH_TTL_MS));

    return { user: toPublicUser(user), tokens };
  }

  static async logout(refreshToken?: string) {
    if (refreshToken) {
      await AuthRepository.revokeRefreshToken(refreshToken);
    }
  }

  static async getCurrentUser(userId: number) {
    const user = await AuthRepository.findByIdWithRole(userId);
    if (!user || user.deletedAt) {
      throw new NotFoundError('User not found');
    }
    return toPublicUser(user);
  }

  static async changePassword(userId: number, input: ChangePasswordInput) {
    const user = await AuthRepository.findByIdWithRole(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const matches = await comparePassword(input.currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    await AuthRepository.updatePassword(user.id, await hashPassword(input.newPassword));
    await AuthRepository.revokeAllUserTokens(user.id);
  }

  static async forgotPassword(input: ForgotPasswordInput) {
    const user = await AuthRepository.findByEmail(input.email);
    if (!user || user.deletedAt) {
      return { resetToken: null as string | null };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await AuthRepository.createPasswordResetToken(user.id, tokenHash, new Date(Date.now() + 60 * 60 * 1000));

    return {
      resetToken: env.NODE_ENV === 'production' ? null : rawToken,
    };
  }

  static async resetPassword(input: ResetPasswordInput) {
    const tokenHash = crypto.createHash('sha256').update(input.token).digest('hex');
    const record = await AuthRepository.findPasswordResetToken(tokenHash);

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedError('Reset token is invalid or expired');
    }

    await AuthRepository.updatePassword(record.userId, await hashPassword(input.password));
    await AuthRepository.markPasswordResetUsed(record.id);
    await AuthRepository.revokeAllUserTokens(record.userId);
  }
}
