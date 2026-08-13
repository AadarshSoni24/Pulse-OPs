import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { prisma } from '../config/database';
import { AppError } from './errorHandler';
import crypto from 'crypto';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      apiKeyWorkspaceId?: string;
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'] as string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string; email: string; name: string };
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, name: true }
      });

      if (!user) {
        throw new AppError('User account associated with token no longer exists', 401);
      }

      req.user = user;
      return next();
    } catch {
      return next(new AppError('Invalid or expired access token', 401));
    }
  }

  // Fallback to API Key authentication
  if (apiKeyHeader) {
    const hashedKey = crypto.createHash('sha256').update(apiKeyHeader).digest('hex');
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash: hashedKey },
      include: { user: { select: { id: true, email: true, name: true } } }
    });

    if (!apiKey || (apiKey.expiresAt && apiKey.expiresAt < new Date())) {
      return next(new AppError('Invalid or expired API Key', 401));
    }

    // Update last used timestamp async
    prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

    req.user = apiKey.user;
    req.apiKeyWorkspaceId = apiKey.workspaceId;
    return next();
  }

  return next(new AppError('Authentication required. Provide a Bearer token or X-API-Key header.', 401));
}
