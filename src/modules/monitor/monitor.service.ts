import { prisma } from '../../config/database';
import { validateUrlForSSRF } from '../../utils/ssrfGuard';
import { AppError } from '../../middleware/errorHandler';

export interface CreateMonitorInput {
  name: string;
  url: string;
  method?: string;
  interval?: number;
  timeout?: number;
  expectedStatus?: number;
  isActive?: boolean;
}

export class MonitorService {
  public static async createMonitor(workspaceId: string, input: CreateMonitorInput, userId: string) {
    // SSRF Guard check
    await validateUrlForSSRF(input.url);

    const existing = await prisma.monitor.findFirst({
      where: { workspaceId, url: input.url }
    });

    if (existing) {
      throw new AppError('A monitor with this URL already exists in this workspace', 400);
    }

    const nextCheckAt = new Date(Date.now() + (input.interval || 60) * 1000);

    const monitor = await prisma.monitor.create({
      data: {
        workspaceId,
        name: input.name,
        url: input.url,
        method: input.method || 'GET',
        interval: input.interval || 60,
        timeout: input.timeout || 5000,
        expectedStatus: input.expectedStatus || 200,
        isActive: input.isActive ?? true,
        nextCheckAt
      }
    });

    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId,
        action: 'MONITOR_CREATED',
        metadata: { monitorId: monitor.id, monitorName: monitor.name, url: monitor.url }
      }
    });

    return monitor;
  }

  public static async getMonitorsByWorkspace(workspaceId: string) {
    const monitors = await prisma.monitor.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        healthChecks: {
          take: 1,
          orderBy: { checkedAt: 'desc' },
          select: { statusCode: true, responseTime: true, success: true, checkedAt: true }
        },
        sslCertificate: {
          select: { expiryDate: true, daysRemaining: true, issuer: true }
        },
        _count: {
          select: { incidents: { where: { status: 'ACTIVE' } } }
        }
      }
    });

    return monitors.map((m) => {
      const latestCheck = m.healthChecks[0];
      const activeIncidents = m._count.incidents;
      return {
        id: m.id,
        workspaceId: m.workspaceId,
        name: m.name,
        url: m.url,
        method: m.method,
        interval: m.interval,
        timeout: m.timeout,
        expectedStatus: m.expectedStatus,
        isActive: m.isActive,
        status: activeIncidents > 0 ? 'DOWN' : latestCheck?.success === false ? 'DEGRADED' : 'UP',
        lastCheckedAt: m.lastCheckedAt,
        nextCheckAt: m.nextCheckAt,
        latestCheck,
        sslCertificate: m.sslCertificate,
        createdAt: m.createdAt
      };
    });
  }

  public static async getMonitorById(workspaceId: string, monitorId: string) {
    const monitor = await prisma.monitor.findFirst({
      where: { id: monitorId, workspaceId },
      include: {
        healthChecks: {
          take: 20,
          orderBy: { checkedAt: 'desc' }
        },
        incidents: {
          take: 10,
          orderBy: { startedAt: 'desc' }
        },
        sslCertificate: true
      }
    });

    if (!monitor) {
      throw new AppError('Monitor not found', 404);
    }

    return monitor;
  }

  public static async updateMonitor(
    workspaceId: string,
    monitorId: string,
    input: Partial<CreateMonitorInput>,
    userId: string
  ) {
    const existing = await prisma.monitor.findFirst({ where: { id: monitorId, workspaceId } });
    if (!existing) {
      throw new AppError('Monitor not found', 404);
    }

    if (input.url) {
      await validateUrlForSSRF(input.url);
    }

    const updated = await prisma.monitor.update({
      where: { id: monitorId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.url && { url: input.url }),
        ...(input.method && { method: input.method }),
        ...(input.interval && { interval: input.interval }),
        ...(input.timeout && { timeout: input.timeout }),
        ...(input.expectedStatus && { expectedStatus: input.expectedStatus }),
        ...(input.isActive !== undefined && { isActive: input.isActive })
      }
    });

    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId,
        action: 'MONITOR_UPDATED',
        metadata: { monitorId, changes: input }
      }
    });

    return updated;
  }

  public static async deleteMonitor(workspaceId: string, monitorId: string, userId: string) {
    const existing = await prisma.monitor.findFirst({ where: { id: monitorId, workspaceId } });
    if (!existing) {
      throw new AppError('Monitor not found', 404);
    }

    await prisma.monitor.delete({ where: { id: monitorId } });

    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId,
        action: 'MONITOR_DELETED',
        metadata: { monitorId, monitorName: existing.name }
      }
    });
  }

  public static async toggleMonitorState(workspaceId: string, monitorId: string, userId: string) {
    const existing = await prisma.monitor.findFirst({ where: { id: monitorId, workspaceId } });
    if (!existing) {
      throw new AppError('Monitor not found', 404);
    }

    const updated = await prisma.monitor.update({
      where: { id: monitorId },
      data: { isActive: !existing.isActive }
    });

    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId,
        action: 'MONITOR_STATE_TOGGLED',
        metadata: { monitorId, isActive: updated.isActive }
      }
    });

    return updated;
  }
}
