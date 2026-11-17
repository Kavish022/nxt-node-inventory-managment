import { Prisma, RoleName } from '@prisma/client';
import { prisma } from '../../config/db';

const userWithRoleInclude = {
  role: {
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  },
} satisfies Prisma.UserInclude;

export class AuthRepository {
  static async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: userWithRoleInclude,
    });
  }

  static async findByIdWithRole(id: number) {
    return prisma.user.findUnique({
      where: { id },
      include: userWithRoleInclude,
    });
  }

  static async findRoleByName(name: RoleName) {
    return prisma.role.findUnique({ where: { name } });
  }

  static async createUser(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
      include: userWithRoleInclude,
    });
  }

  static async updateLastLogin(id: number) {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  static async updatePassword(id: number, passwordHash: string) {
    return prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  static async saveRefreshToken(userId: number, token: string, expiresAt: Date) {
    return prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });
  }

  static async findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: userWithRoleInclude } },
    });
  }

  static async revokeRefreshToken(token: string) {
    return prisma.refreshToken.updateMany({
      where: { token, revoked: false },
      data: { revoked: true },
    });
  }

  static async revokeAllUserTokens(userId: number) {
    return prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  static async createPasswordResetToken(userId: number, tokenHash: string, expiresAt: Date) {
    return prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  static async findPasswordResetToken(tokenHash: string) {
    return prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  static async markPasswordResetUsed(id: number) {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }
}
