import { prisma } from '../config/database';
import { healthCheckQueue } from '../config/redis';
import { logger } from '../utils/logger';

export class SchedulerWorker {
  private static isRunning = false;
  private static intervalTimer: NodeJS.Timeout | null = null;

  public static start(intervalMs = 10000) {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info('Scheduler worker started');
    this.intervalTimer = setInterval(async () => {
      await this.scheduleDueMonitors();
    }, intervalMs);
  }

  public static stop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.isRunning = false;
    logger.info('Scheduler worker stopped');
  }

  public static async scheduleDueMonitors() {
    try {
      const now = new Date();
      const dueMonitors = await prisma.monitor.findMany({
        where: {
          isActive: true,
          OR: [{ nextCheckAt: { lte: now } }, { nextCheckAt: null }]
        }
      });

      if (dueMonitors.length === 0) return;

      logger.info(`Scheduler found ${dueMonitors.length} monitors due for health check`);

      for (const monitor of dueMonitors) {
        const nextCheckAt = new Date(now.getTime() + monitor.interval * 1000);

        // Update nextCheckAt in database to prevent double scheduling
        await prisma.monitor.update({
          where: { id: monitor.id },
          data: { nextCheckAt }
        });

        const jobId = `check-${monitor.id}-${Math.floor(now.getTime() / (monitor.interval * 1000))}`;

        await healthCheckQueue.add(
          'execute-health-check',
          {
            monitorId: monitor.id,
            url: monitor.url,
            method: monitor.method,
            timeout: monitor.timeout,
            expectedStatus: monitor.expectedStatus
          },
          { jobId }
        );
      }
    } catch (error: any) {
      logger.error('Error during monitor scheduling pass', { error: error.message });
    }
  }
}
