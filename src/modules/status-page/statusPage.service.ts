import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export class StatusPageService {
  public static async createStatusPage(
    workspaceId: string,
    name: string,
    slug: string,
    monitorIds: string[],
    isPublic: boolean,
    userId: string
  ) {
    const existing = await prisma.statusPage.findUnique({ where: { slug } });
    if (existing) {
      throw new AppError('A status page with this slug already exists', 400);
    }

    const page = await prisma.statusPage.create({
      data: {
        workspaceId,
        name,
        slug,
        monitorIds,
        isPublic
      }
    });

    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId,
        action: 'STATUS_PAGE_CREATED',
        metadata: { slug, pageName: name }
      }
    });

    return page;
  }

  public static async getStatusPagesByWorkspace(workspaceId: string) {
    return prisma.statusPage.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    });
  }

  public static async getPublicStatusPage(slug: string) {
    const page = await prisma.statusPage.findUnique({
      where: { slug }
    });

    if (!page || !page.isPublic) {
      throw new AppError('Status page not found or is set to private', 404);
    }

    const monitors = await prisma.monitor.findMany({
      where: {
        id: { in: page.monitorIds },
        workspaceId: page.workspaceId
      },
      include: {
        healthChecks: {
          take: 1,
          orderBy: { checkedAt: 'desc' }
        },
        incidents: {
          take: 5,
          orderBy: { startedAt: 'desc' }
        }
      }
    });

    let hasMajorOutage = false;
    let hasPartialOutage = false;

    const components = monitors.map((m) => {
      const lastCheck = m.healthChecks[0];
      const activeIncidents = m.incidents.filter((i) => i.status === 'ACTIVE');

      let status = 'OPERATIONAL';
      if (activeIncidents.length > 0) {
        status = 'MAJOR_OUTAGE';
        hasMajorOutage = true;
      } else if (lastCheck && !lastCheck.success) {
        status = 'DEGRADED_PERFORMANCE';
        hasPartialOutage = true;
      }

      return {
        id: m.id,
        name: m.name,
        status,
        lastCheckedAt: lastCheck?.checkedAt || null,
        latestResponseTime: lastCheck?.responseTime || null
      };
    });

    const systemStatus = hasMajorOutage
      ? 'Major Outage'
      : hasPartialOutage
      ? 'Partial System Degradation'
      : 'All Systems Operational';

    const recentIncidents = monitors
      .flatMap((m) =>
        m.incidents.map((i) => ({
          id: i.id,
          monitorName: m.name,
          status: i.status,
          reason: i.reason,
          startedAt: i.startedAt,
          resolvedAt: i.resolvedAt,
          durationSeconds: i.duration
        }))
      )
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, 10);

    return {
      title: page.name,
      slug: page.slug,
      systemStatus,
      updatedAt: new Date(),
      components,
      incidents: recentIncidents
    };
  }
}
