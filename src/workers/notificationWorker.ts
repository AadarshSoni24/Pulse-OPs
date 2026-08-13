import { Worker, Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { redisConnectionOptions, QUEUE_NAMES } from '../config/redis';
import { env } from '../config/environment';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export interface NotificationJobData {
  type: 'INCIDENT_CREATED' | 'INCIDENT_RESOLVED';
  recipient: string;
  monitorName: string;
  monitorUrl: string;
  reason?: string;
  duration?: number;
  incidentId?: string;
}

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
});

export const notificationWorker = new Worker<NotificationJobData>(
  QUEUE_NAMES.NOTIFICATION,
  async (job: Job<NotificationJobData>) => {
    const { type, recipient, monitorName, monitorUrl, reason, duration, incidentId } = job.data;

    const subject =
      type === 'INCIDENT_CREATED'
        ? `[ALERT] Incident Detected on ${monitorName}`
        : `[RECOVERED] ${monitorName} is back online`;

    const html =
      type === 'INCIDENT_CREATED'
        ? `<h2>PulseOps Alert: ${monitorName} is DOWN</h2>
           <p><strong>URL:</strong> ${monitorUrl}</p>
           <p><strong>Reason:</strong> ${reason}</p>
           <p><strong>Time:</strong> ${new Date().toISOString()}</p>`
        : `<h2>PulseOps Recovery: ${monitorName} is UP</h2>
           <p><strong>URL:</strong> ${monitorUrl}</p>
           <p><strong>Outage Duration:</strong> ${duration ? `${duration} seconds` : 'N/A'}</p>
           <p><strong>Resolved Time:</strong> ${new Date().toISOString()}</p>`;

    let status = 'SENT';
    try {
      if (env.NODE_ENV !== 'test') {
        await transporter.sendMail({
          from: env.EMAIL_FROM,
          to: recipient,
          subject,
          html
        });
      }
      logger.info(`Notification sent to ${recipient} for ${type}`);
    } catch (err: any) {
      status = 'FAILED';
      logger.error(`Failed to send email to ${recipient}`, { error: err.message });
      throw err;
    } finally {
      if (incidentId) {
        await prisma.notification.create({
          data: {
            incidentId,
            channel: 'EMAIL',
            recipient,
            status
          }
        }).catch(() => {});
      }
    }
  },
  { connection: redisConnectionOptions, concurrency: 5 }
);

notificationWorker.on('error', (err) => {
  if (process.env.NODE_ENV !== 'test') {
    logger.error('Notification Worker Redis error', { error: err.message });
  }
});
