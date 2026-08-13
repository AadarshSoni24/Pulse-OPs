import { Worker, Job } from 'bullmq';
import tls from 'tls';
import { URL } from 'url';
import { redisConnectionOptions, QUEUE_NAMES } from '../config/redis';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export interface SslCheckJobData {
  monitorId: string;
  url: string;
}

export const sslWorker = new Worker<SslCheckJobData>(
  QUEUE_NAMES.SSL_CHECK,
  async (job: Job<SslCheckJobData>) => {
    const { monitorId, url } = job.data;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return;
    }

    if (parsedUrl.protocol !== 'https:') return;

    const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : 443;
    const hostname = parsedUrl.hostname;

    return new Promise<void>((resolve) => {
      const socket = tls.connect(port, hostname, { servername: hostname, rejectUnauthorized: false }, () => {
        const cert = socket.getPeerCertificate();
        if (cert && cert.valid_to) {
          const expiryDate = new Date(cert.valid_to);
          const daysRemaining = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          const rawIssuer = cert.issuer ? cert.issuer.O || cert.issuer.CN || 'Unknown Issuer' : 'Unknown';
          const issuer = Array.isArray(rawIssuer) ? rawIssuer.join(', ') : String(rawIssuer);

          prisma.sslCertificate
            .upsert({
              where: { monitorId },
              update: {
                expiryDate,
                daysRemaining,
                issuer,
                lastChecked: new Date()
              },
              create: {
                monitorId,
                expiryDate,
                daysRemaining,
                issuer,
                lastChecked: new Date()
              }
            })
            .catch((err) => {
              logger.error('Failed to save SSL cert details', { error: err.message });
            });
        }
        socket.end();
        resolve();
      });

      socket.on('error', (err) => {
        logger.warn(`SSL check connection error for ${hostname}`, { error: err.message });
        resolve();
      });

      socket.setTimeout(5000, () => {
        socket.destroy();
        resolve();
      });
    });
  },
  { connection: redisConnectionOptions, concurrency: 5 }
);
