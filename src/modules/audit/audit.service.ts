import { prisma } from '../../config/database';

export class AuditService {
  public static async getWorkspaceAuditLogs(workspaceId: string, limit = 50, page = 1) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      }),
      prisma.auditLog.count({ where: { workspaceId } })
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        user: log.user ? { id: log.user.id, name: log.user.name, email: log.user.email } : null,
        metadata: log.metadata,
        createdAt: log.createdAt
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
