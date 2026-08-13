import { prisma } from '../../config/database';
import { healthCheckQueue, incidentQueue, notificationQueue, sslCheckQueue } from '../../config/redis';

export class MetricsService {
  public static async getSystemMetrics() {
    const [
      totalHealthChecks,
      successfulChecks,
      failedChecks,
      avgLatencyResult,
      activeIncidents,
      totalNotifications,
      failedNotifications,
      healthQueueCount,
      incidentQueueCount,
      notificationQueueCount,
      sslQueueCount
    ] = await Promise.all([
      prisma.healthCheck.count(),
      prisma.healthCheck.count({ where: { success: true } }),
      prisma.healthCheck.count({ where: { success: false } }),
      prisma.healthCheck.aggregate({ _avg: { responseTime: true } }),
      prisma.incident.count({ where: { status: 'ACTIVE' } }),
      prisma.notification.count(),
      prisma.notification.count({ where: { status: 'FAILED' } }),
      healthCheckQueue.getJobCounts(),
      incidentQueue.getJobCounts(),
      notificationQueue.getJobCounts(),
      sslCheckQueue.getJobCounts()
    ]);

    const successRate =
      totalHealthChecks === 0
        ? 100
        : parseFloat(((successfulChecks / totalHealthChecks) * 100).toFixed(2));

    return {
      timestamp: new Date().toISOString(),
      healthChecks: {
        total: totalHealthChecks,
        successful: successfulChecks,
        failed: failedChecks,
        successRatePercent: successRate,
        avgLatencyMs: Math.round(avgLatencyResult._avg.responseTime || 0)
      },
      incidents: {
        active: activeIncidents
      },
      notifications: {
        total: totalNotifications,
        failed: failedNotifications
      },
      queues: {
        healthCheck: healthQueueCount,
        incident: incidentQueueCount,
        notification: notificationQueueCount,
        sslCheck: sslQueueCount
      }
    };
  }
}
