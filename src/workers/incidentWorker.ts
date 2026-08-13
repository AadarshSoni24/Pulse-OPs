import { Worker, Job } from 'bullmq';
import { redisConnectionOptions, QUEUE_NAMES, notificationQueue } from '../config/redis';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export interface IncidentJobData {
  type: 'FAILURE' | 'RECOVERY';
  monitorId: string;
  reason?: string;
  incidentId?: string;
  duration?: number;
}

export const incidentWorker = new Worker<IncidentJobData>(
  QUEUE_NAMES.INCIDENT,
  async (job: Job<IncidentJobData>) => {
    const { type, monitorId, reason } = job.data;

    if (type === 'FAILURE') {
      const activeIncident = await prisma.incident.findFirst({
        where: { monitorId, status: 'ACTIVE' }
      });

      // Maintain single continuous outage = 1 active incident
      if (!activeIncident) {
        const newIncident = await prisma.incident.create({
          data: {
            monitorId,
            status: 'ACTIVE',
            reason: reason || 'Monitor health check failed'
          },
          include: { monitor: { include: { workspace: { include: { members: { include: { user: true } } } } } } }
        });

        logger.info(`Incident created for monitor ${monitorId}`, { incidentId: newIncident.id });

        // Dispatch notifications to workspace members
        const members = newIncident.monitor.workspace.members;
        for (const member of members) {
          await notificationQueue.add('send-email', {
            type: 'INCIDENT_CREATED',
            recipient: member.user.email,
            monitorName: newIncident.monitor.name,
            monitorUrl: newIncident.monitor.url,
            reason: newIncident.reason,
            startedAt: newIncident.startedAt
          });
        }
      }
    } else if (type === 'RECOVERY') {
      const monitor = await prisma.monitor.findUnique({
        where: { id: monitorId },
        include: { workspace: { include: { members: { include: { user: true } } } } }
      });

      if (monitor) {
        for (const member of monitor.workspace.members) {
          await notificationQueue.add('send-email', {
            type: 'INCIDENT_RESOLVED',
            recipient: member.user.email,
            monitorName: monitor.name,
            monitorUrl: monitor.url,
            duration: job.data.duration
          });
        }
      }
    }
  },
  { connection: redisConnectionOptions, concurrency: 5 }
);
