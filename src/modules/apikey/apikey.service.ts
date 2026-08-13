import crypto from 'crypto';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export class ApiKeyService {
  public static async createApiKey(
    workspaceId: string,
    name: string,
    userId: string,
    expiresInDays?: number
  ) {
    const rawKey = `pk_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = rawKey.substring(0, 12);

    let expiresAt: Date | undefined;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const apiKey = await prisma.apiKey.create({
      data: {
        workspaceId,
        userId,
        name,
        keyHash,
        prefix,
        expiresAt
      }
    });

    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId,
        action: 'API_KEY_CREATED',
        metadata: { keyId: apiKey.id, name, prefix }
      }
    });

    return {
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt
      },
      secretKey: rawKey // Only returned once!
    };
  }

  public static async getApiKeysByWorkspace(workspaceId: string) {
    const keys = await prisma.apiKey.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } }
      }
    });

    return keys;
  }

  public static async revokeApiKey(workspaceId: string, keyId: string, userId: string) {
    const key = await prisma.apiKey.findFirst({ where: { id: keyId, workspaceId } });
    if (!key) {
      throw new AppError('API key not found', 404);
    }

    await prisma.apiKey.delete({ where: { id: keyId } });

    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId,
        action: 'API_KEY_REVOKED',
        metadata: { keyId, name: key.name }
      }
    });
  }
}
