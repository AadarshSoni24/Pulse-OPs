import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export class AnalyticsService {
  public static async getMonitorAnalytics(workspaceId: string, monitorId: string, timeframeHours = 24) {
    const monitor = await prisma.monitor.findFirst({
      where: { id: monitorId, workspaceId }
    });

    if (!monitor) {
      throw new AppError('Monitor not found in workspace', 404);
    }

    const sinceDate = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);

    const checks = await prisma.healthCheck.findMany({
      where: {
        monitorId,
        checkedAt: { gte: sinceDate }
      },
      orderBy: { checkedAt: 'asc' }
    });

    const totalChecks = checks.length;
    const successfulChecks = checks.filter((c) => c.success).length;
    const failedChecks = totalChecks - successfulChecks;

    const uptimePercentage =
      totalChecks === 0 ? 100 : parseFloat(((successfulChecks / totalChecks) * 100).toFixed(2));

    const responseTimes = checks
      .map((c) => c.responseTime)
      .filter((t): t is number => typeof t === 'number')
      .sort((a, b) => a - b);

    const avgLatency =
      responseTimes.length === 0
        ? 0
        : Math.round(responseTimes.reduce((acc, val) => acc + val, 0) / responseTimes.length);
    const minLatency = responseTimes.length === 0 ? 0 : responseTimes[0];
    const maxLatency = responseTimes.length === 0 ? 0 : responseTimes[responseTimes.length - 1];

    const getPercentile = (p: number) => {
      if (responseTimes.length === 0) return 0;
      const index = Math.round((p / 100) * (responseTimes.length - 1));
      return responseTimes[Math.max(0, Math.min(index, responseTimes.length - 1))];
    };

    const p50 = getPercentile(50);
    const p95 = getPercentile(95);
    const p99 = getPercentile(99);

    // Fetch Incidents in timeframe
    const incidents = await prisma.incident.findMany({
      where: {
        monitorId,
        startedAt: { gte: sinceDate }
      }
    });

    const resolvedIncidents = incidents.filter((i) => i.duration !== null && i.duration !== undefined);
    const totalDowntimeSeconds = resolvedIncidents.reduce((sum, i) => sum + (i.duration || 0), 0);

    const mttrSeconds =
      resolvedIncidents.length === 0
        ? 0
        : Math.round(totalDowntimeSeconds / resolvedIncidents.length);

    const mtbfHours =
      incidents.length <= 1 ? timeframeHours : parseFloat((timeframeHours / incidents.length).toFixed(1));

    return {
      monitorId,
      monitorName: monitor.name,
      url: monitor.url,
      timeframeHours,
      summary: {
        uptimePercentage: `${uptimePercentage}%`,
        totalChecks,
        successfulChecks,
        failedChecks,
        totalIncidents: incidents.length
      },
      latency: {
        avgMs: avgLatency,
        minMs: minLatency,
        maxMs: maxLatency,
        p50Ms: p50,
        p95Ms: p95,
        p99Ms: p99
      },
      reliability: {
        mttrSeconds,
        mtbfHours,
        totalDowntimeSeconds
      },
      recentChecks: checks.slice(-30).map((c) => ({
        timestamp: c.checkedAt,
        statusCode: c.statusCode,
        responseTime: c.responseTime,
        success: c.success
      }))
    };
  }
}
