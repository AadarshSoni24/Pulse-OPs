import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/environment';
import { AppError } from '../../middleware/errorHandler';

export class AuthService {
  private static SALT_ROUNDS = 10;

  public static async register(name: string, email: string, password: string) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('Email address is already registered', 400);
    }

    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash
        }
      });

      // Create default personal workspace for user
      const workspace = await tx.workspace.create({
        data: {
          name: `${user.name}'s Workspace`,
          ownerId: user.id
        }
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: 'OWNER'
        }
      });

      const tokens = await this.generateTokens(user.id, user.email, user.name);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt
        },
        workspace: {
          id: workspace.id,
          name: workspace.name
        },
        ...tokens
      };
    });
  }

  public static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const tokens = await this.generateTokens(user.id, user.email, user.name);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      ...tokens
    };
  }

  public static async refreshAccessToken(refreshToken: string) {
    let payload: { userId: string; email: string; name: string };
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
        userId: string;
        email: string;
        name: string;
      };
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const savedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken }
    });

    if (!savedToken || savedToken.revoked || savedToken.expiresAt < new Date()) {
      throw new AppError('Refresh token revoked or expired', 401);
    }

    // Revoke old refresh token (Rotation)
    await prisma.refreshToken.update({
      where: { id: savedToken.id },
      data: { revoked: true }
    });

    // Issue new pair
    return this.generateTokens(payload.userId, payload.email, payload.name);
  }

  public static async logout(refreshToken: string) {
    if (!refreshToken) return;
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revoked: true }
    });
  }

  public static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            workspace: {
              select: {
                id: true,
                name: true,
                ownerId: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  private static async generateTokens(userId: string, email: string, name: string) {
    const accessToken = jwt.sign({ userId, email, name }, env.JWT_ACCESS_SECRET, {
      expiresIn: '15m'
    });

    const refreshToken = jwt.sign({ userId, email, name }, env.JWT_REFRESH_SECRET, {
      expiresIn: '7d'
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt
      }
    });

    return {
      accessToken,
      refreshToken
    };
  }
}
